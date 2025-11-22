"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";
import { createNotionClient, fetchPageContent } from "@/lib/notion/client";
import { transformSearchResultsToActivities } from "@/lib/notion/transformers";
import type {
  SyncNotionResult,
  GetNotionActivitiesOptions,
  GetNotionActivitiesResult,
  NotionPage,
  NotionDatabase,
} from "@/lib/notion/types";
import { isFullPage, isFullDatabase } from "@notionhq/client";
import type {
  PageObjectResponse,
  DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

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
        updatedItemsCount: 0,
        totalItems: 0,
        lastSyncedAt: new Date().toISOString(),
        error: "Unauthorized - please connect your Notion account",
      };
    }

    const accessToken = session.notionAccessToken;
    const userId = session.user.id;
    const notion = createNotionClient(accessToken);

    // Step 1: Get authenticated user's workspace user ID
    let workspaceUserId: string;

    // Check if we have it in session
    if (session.notionWorkspaceUserId) {
      workspaceUserId = session.notionWorkspaceUserId;
    } else {
      // Fetch from Notion API using SDK
      try {
        const meData = await notion.users.me({});
        if (meData.type === "bot" && meData.bot.owner.type === "user") {
          workspaceUserId = meData.bot.owner.user.id;
        } else {
          return {
            success: false,
            newItemsCount: 0,
            updatedItemsCount: 0,
            totalItems: 0,
            lastSyncedAt: new Date().toISOString(),
            error: "Failed to get workspace user ID from Notion",
          };
        }
      } catch (error) {
        console.error("Error fetching user info from Notion:", error);
        return {
          success: false,
          newItemsCount: 0,
          updatedItemsCount: 0,
          totalItems: 0,
          lastSyncedAt: new Date().toISOString(),
          error: "Failed to fetch user info from Notion",
        };
      }
    }

    // Step 2: Calculate date threshold (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateThreshold = thirtyDaysAgo;

    // Step 3: Search for all pages and databases using SDK
    const allResults: Array<NotionPage | NotionDatabase> = [];

    try {
      let hasMore = true;
      let startCursor: string | undefined = undefined;

      while (hasMore) {
        const searchResponse = await notion.search({
          sort: {
            direction: "descending",
            timestamp: "last_edited_time",
          },
          page_size: 100,
          start_cursor: startCursor,
        });

        // Filter and convert SDK types to our internal types
        for (const result of searchResponse.results) {
          if (isFullPage(result)) {
            allResults.push(result as unknown as NotionPage);
          } else if (isFullDatabase(result)) {
            allResults.push(result as unknown as NotionDatabase);
          }
        }

        // Check if we've gone past our date threshold (optimization)
        if (searchResponse.results.length > 0) {
          const oldestItem = searchResponse.results[searchResponse.results.length - 1];

          if ((isFullPage(oldestItem) || isFullDatabase(oldestItem))) {
            const oldestTime = new Date(oldestItem.last_edited_time);
            if (oldestTime < dateThreshold) {
              // We've gone past 30 days, stop paginating
              break;
            }
          }
        }

        hasMore = searchResponse.has_more;
        startCursor = searchResponse.next_cursor || undefined;
      }
    } catch (error) {
      console.error("Error searching Notion pages:", error);
      return {
        success: false,
        newItemsCount: 0,
        updatedItemsCount: 0,
        totalItems: 0,
        lastSyncedAt: new Date().toISOString(),
        error: "Failed to search Notion pages",
      };
    }

    // Step 4: Transform results to activities (with client-side filtering)
    const activities = transformSearchResultsToActivities(
      allResults,
      userId,
      workspaceUserId,
      dateThreshold
    );

    // Step 5: First, clean up any existing duplicates before upserting
    // This handles cases where duplicates were created before the fix
    const { data: existingActivities } = await supabaseAdmin
      .from("notion_activities")
      .select("id, metadata, occurred_at, created_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false });

    if (existingActivities && existingActivities.length > 0) {
      const pageGroups = new Map<string, typeof existingActivities>();

      for (const activity of existingActivities) {
        const metadata = activity.metadata as { notion_page_id?: string };
        const pageId = metadata?.notion_page_id;

        if (!pageId) continue;

        if (!pageGroups.has(pageId)) {
          pageGroups.set(pageId, []);
        }
        pageGroups.get(pageId)!.push(activity);
      }

      const idsToDelete: string[] = [];

      for (const group of pageGroups.values()) {
        if (group.length > 1) {
          // Sort by occurred_at DESC, then created_at DESC
          group.sort((a, b) => {
            const timeCompare =
              new Date(b.occurred_at).getTime() -
              new Date(a.occurred_at).getTime();
            if (timeCompare !== 0) return timeCompare;

            return (
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
            );
          });

          // Keep the first one (most recent), delete the rest
          for (let i = 1; i < group.length; i++) {
            idsToDelete.push(group[i].id);
          }
        }
      }

      if (idsToDelete.length > 0) {
        await supabaseAdmin
          .from("notion_activities")
          .delete()
          .in("id", idsToDelete);
      }
    }

    // Step 6: Upsert activities to database with deduplication
    // Keep only one entry per page, update with latest timestamp
    let newCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const activity of activities) {
      try {
        const metadata = activity.metadata as { notion_page_id?: string };
        const notionPageId = metadata.notion_page_id;

        if (!notionPageId) {
          continue;
        }

        // Check if activity already exists for this page (regardless of timestamp)
        const { data: existing } = await supabaseAdmin
          .from("notion_activities")
          .select("id, occurred_at")
          .eq("user_id", activity.user_id || "")
          .eq("metadata->>notion_page_id", notionPageId)
          .maybeSingle();

        // Fetch page content (plain text)
        let content: string | null = null;
        try {
          content = await fetchPageContent(notionPageId, accessToken);
        } catch (contentError) {
          console.error(`Failed to fetch content for page ${notionPageId}:`, contentError);
          // Continue without content - we still want to save the activity
        }

        if (!existing) {
          // Insert new activity with content
          const { error: insertError } = await supabaseAdmin
            .from("notion_activities")
            .insert({
              ...activity,
              content,
            });

          if (insertError) {
            console.error("Error inserting Notion activity:", insertError);
            errors.push(`Failed to insert activity: ${activity.title}`);
          } else {
            newCount++;
          }
        } else {
          // Update existing activity with latest data and content
          const { error: updateError } = await supabaseAdmin
            .from("notion_activities")
            .update({
              title: activity.title,
              description: activity.description,
              url: activity.url,
              activity_type: activity.activity_type,
              occurred_at: activity.occurred_at,
              metadata: activity.metadata,
              content,
              synced_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            console.error("Error updating Notion activity:", updateError);
          } else {
            updatedCount++;
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
      updatedItemsCount: updatedCount,
      totalItems: activities.length,
      lastSyncedAt: new Date().toISOString(),
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  } catch (error: unknown) {
    console.error("Error syncing Notion activity:", error);

    return {
      success: false,
      newItemsCount: 0,
      updatedItemsCount: 0,
      totalItems: 0,
      lastSyncedAt: new Date().toISOString(),
      error: "Failed to sync Notion activities",
    };
  }
}

