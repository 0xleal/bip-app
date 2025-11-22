"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  notionPost,
  notionGet,
  extractNotionRateLimitInfo,
  waitForRateLimit,
} from "@/lib/notion/client";
import { transformSearchResultsToActivities } from "@/lib/notion/transformers";
import type {
  NotionSearchResponse,
  NotionMeResponse,
  SyncNotionResult,
  GetNotionActivitiesOptions,
  GetNotionActivitiesResult,
} from "@/lib/notion/types";

/**
 * Calculate date threshold for date range filtering
 */
function calculateDateThreshold(
  dateRange: "24h" | "7d" | "30d" | "custom",
  customStartDate?: string
): string {
  if (dateRange === "custom" && customStartDate) {
    return customStartDate;
  }

  const now = new Date();
  const thresholds: Record<"24h" | "7d" | "30d" | "custom", number> = {
    "24h": 24 * 60 * 60 * 1000, // 24 hours
    "7d": 7 * 24 * 60 * 60 * 1000, // 7 days
    "30d": 30 * 24 * 60 * 60 * 1000, // 30 days
    custom: 0, // Will use customStartDate
  };

  const threshold = new Date(now.getTime() - thresholds[dateRange]);
  return threshold.toISOString();
}

/**
 * Get Notion activities from database
 *
 * Server Action to fetch user's Notion activities from the database
 * Supports date range filtering
 */
export async function getNotionActivities(
  options: GetNotionActivitiesOptions = {}
): Promise<GetNotionActivitiesResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { error: "Unauthorized - please sign in" };
    }

    const { dateRange = "7d", customStartDate } = options;

    // Calculate date threshold
    const threshold = calculateDateThreshold(dateRange, customStartDate);

    // Query database (using admin client since we validate auth at application level)
    const { data, error } = await supabaseAdmin
      .from("notion_activities")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("occurred_at", threshold)
      .order("occurred_at", { ascending: false });

    if (error) {
      console.error("Error fetching Notion activities from database:", error);
      return { error: "Failed to fetch Notion activities" };
    }

    return { activities: data || [] };
  } catch (error) {
    console.error("Unexpected error in getNotionActivities:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Sync Notion activities from Notion API to database
 *
 * Server Action to fetch latest activities from Notion Search API,
 * transform them to our schema, and store in database with deduplication
 */
export async function syncNotionActivity(): Promise<SyncNotionResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user || !session.notionAccessToken) {
      return {
        success: false,
        newItemsCount: 0,
        totalItems: 0,
        lastSyncedAt: new Date().toISOString(),
        error: "Unauthorized - please connect your Notion account",
      };
    }

    const accessToken = session.notionAccessToken;
    const userId = session.user.id;

    // Step 1: Get authenticated user's workspace user ID
    let workspaceUserId: string;

    // Check if we have it in session
    if (session.notionWorkspaceUserId) {
      workspaceUserId = session.notionWorkspaceUserId;
    } else {
      // Fetch from Notion API
      const meResponse = await notionGet("/users/me", accessToken);

      if (!meResponse.ok) {
        const retryAfter = extractNotionRateLimitInfo(meResponse.headers);
        if (retryAfter) {
          return {
            success: false,
            newItemsCount: 0,
            totalItems: 0,
            lastSyncedAt: new Date().toISOString(),
            error: `Rate limited - retry after ${retryAfter} seconds`,
          };
        }

        return {
          success: false,
          newItemsCount: 0,
          totalItems: 0,
          lastSyncedAt: new Date().toISOString(),
          error: "Failed to fetch user info from Notion",
        };
      }

      const meData: NotionMeResponse = await meResponse.json();
      workspaceUserId = meData.bot.owner.user.id;
    }

    // Step 2: Calculate date threshold (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateThreshold = thirtyDaysAgo;

    // Step 3: Search for all pages and databases, sorted by last_edited_time
    const allResults: Array<NotionSearchResponse["results"][0]> = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;
    let consecutiveRateLimits = 0;
    const MAX_RATE_LIMIT_RETRIES = 3;

    while (hasMore) {
      const searchBody: {
        sort: { direction: string; timestamp: string };
        page_size: number;
        start_cursor?: string;
      } = {
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
        page_size: 100,
      };

      if (startCursor) {
        searchBody.start_cursor = startCursor;
      }

      const searchResponse = await notionPost("/search", accessToken, searchBody);

      // Handle rate limiting
      if (searchResponse.status === 429) {
        const retryAfter = extractNotionRateLimitInfo(searchResponse.headers);

        if (consecutiveRateLimits >= MAX_RATE_LIMIT_RETRIES) {
          return {
            success: false,
            newItemsCount: 0,
            totalItems: 0,
            lastSyncedAt: new Date().toISOString(),
            error: "Rate limit exceeded - please try again later",
          };
        }

        if (retryAfter) {
          await waitForRateLimit(retryAfter);
          consecutiveRateLimits++;
          continue; // Retry the same request
        }
      }

      consecutiveRateLimits = 0; // Reset on successful request

      if (!searchResponse.ok) {
        console.error("Notion search failed:", searchResponse.status);
        return {
          success: false,
          newItemsCount: 0,
          totalItems: 0,
          lastSyncedAt: new Date().toISOString(),
          error: "Failed to search Notion pages",
        };
      }

      const searchData: NotionSearchResponse = await searchResponse.json();
      allResults.push(...searchData.results);

      // Check if we've gone past our date threshold (optimization)
      if (searchData.results.length > 0) {
        const oldestItem =
          searchData.results[searchData.results.length - 1];
        const oldestTime = new Date(oldestItem.last_edited_time);

        if (oldestTime < dateThreshold) {
          // We've gone past 30 days, stop paginating
          break;
        }
      }

      hasMore = searchData.has_more;
      startCursor = searchData.next_cursor || undefined;
    }

    // Step 4: Transform results to activities (with client-side filtering)
    const activities = transformSearchResultsToActivities(
      allResults,
      userId,
      workspaceUserId,
      dateThreshold
    );

    // Step 5: Upsert activities to database with deduplication
    let newCount = 0;
    const errors: string[] = [];

    for (const activity of activities) {
      try {
        const metadata = activity.metadata as { notion_page_id?: string };
        const notionPageId = metadata.notion_page_id;

        if (!notionPageId) {
          continue;
        }

        // Check if activity already exists based on page_id and occurred_at
        const { data: existing } = await supabaseAdmin
          .from("notion_activities")
          .select("id")
          .eq("user_id", activity.user_id || "")
          .eq("metadata->>notion_page_id", notionPageId)
          .eq("occurred_at", activity.occurred_at)
          .maybeSingle();

        if (!existing) {
          // Insert new activity
          const { error: insertError } = await supabaseAdmin
            .from("notion_activities")
            .insert(activity);

          if (insertError) {
            console.error("Error inserting Notion activity:", insertError);
            errors.push(`Failed to insert activity: ${activity.title}`);
          } else {
            newCount++;
          }
        } else {
          // Update synced_at for existing activity
          const { error: updateError } = await supabaseAdmin
            .from("notion_activities")
            .update({ synced_at: new Date().toISOString() })
            .eq("id", existing.id);

          if (updateError) {
            console.error("Error updating Notion activity:", updateError);
          }
        }
      } catch (activityError) {
        console.error("Error processing Notion activity:", activityError);
        errors.push(`Error processing activity: ${activity.title}`);
      }
    }

    return {
      success: true,
      newItemsCount: newCount,
      totalItems: activities.length,
      lastSyncedAt: new Date().toISOString(),
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  } catch (error: unknown) {
    console.error("Error syncing Notion activity:", error);

    return {
      success: false,
      newItemsCount: 0,
      totalItems: 0,
      lastSyncedAt: new Date().toISOString(),
      error: "Failed to sync Notion activities",
    };
  }
}

