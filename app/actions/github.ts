"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";
import { createGitHubClient, extractRateLimitInfo } from "@/lib/github/client";
import { transformEventsToActivities } from "@/lib/github/transformers";
import type {
  GetActivitiesOptions,
  GetActivitiesResult,
  SyncResult,
  DateRange,
} from "@/lib/github/types";

/**
 * Calculate date threshold for date range filtering
 */
function calculateDateThreshold(
  dateRange: DateRange,
  customStartDate?: string,
): string {
  if (dateRange === "custom" && customStartDate) {
    return customStartDate;
  }

  const now = new Date();
  const thresholds: Record<DateRange, number> = {
    "24h": 24 * 60 * 60 * 1000, // 24 hours
    "7d": 7 * 24 * 60 * 60 * 1000, // 7 days
    "30d": 30 * 24 * 60 * 60 * 1000, // 30 days
    custom: 0, // Will use customStartDate
  };

  const threshold = new Date(now.getTime() - thresholds[dateRange]);
  return threshold.toISOString();
}

/**
 * Get GitHub activities from database
 *
 * Server Action to fetch user's GitHub activities from the database
 * Supports date range filtering and activity type filtering
 */
export async function getGitHubActivities(
  options: GetActivitiesOptions = {},
): Promise<GetActivitiesResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { error: "Unauthorized - please sign in" };
    }

    const { dateRange = "7d", activityTypes, customStartDate } = options;

    // Calculate date threshold
    const threshold = calculateDateThreshold(dateRange, customStartDate);

    // Query database (using admin client since we validate auth at application level)
    let query = supabaseAdmin
      .from("github_activities")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("occurred_at", threshold)
      .order("occurred_at", { ascending: false });

    // Apply activity type filter if provided
    if (activityTypes && activityTypes.length > 0) {
      query = query.in("activity_type", activityTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activities from database:", error);
      return { error: "Failed to fetch activities" };
    }

    return { activities: data || [] };
  } catch (error) {
    console.error("Unexpected error in getGitHubActivities:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Sync GitHub activities from GitHub API to database
 *
 * Server Action to fetch latest activities from GitHub Events API,
 * transform them to our schema, and store in database with deduplication
 */
export async function syncGitHubActivity(): Promise<SyncResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user || !session.accessToken) {
      return {
        success: false,
        newItemsCount: 0,
        totalItems: 0,
        lastSyncedAt: new Date().toISOString(),
        rateLimitRemaining: 0,
        rateLimitReset: new Date().toISOString(),
        error: "Unauthorized - please sign in",
      };
    }

    // Create GitHub client
    const octokit = createGitHubClient(session.accessToken);

    // Calculate date threshold for fetching recent activities (last 30 days as per GitHub API limit)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceDate = thirtyDaysAgo.toISOString();

    // Fetch events from GitHub API using the user's GitHub username
    // Note: We use listEventsForAuthenticatedUser which requires username
    const response = await octokit.rest.activity.listEventsForAuthenticatedUser(
      {
        username: session.user.github_username,
        per_page: 100,
      },
    );

    const events = response.data;
    let rateLimitInfo = extractRateLimitInfo(
      response.headers as Record<string, string>,
    );

    // Fetch actual commits using Commits API (more reliable for commit details)
    // Events API doesn't always include commit details in PushEvent payload
    const reposWithCommits = new Map<string, unknown[]>();

    // Get unique repositories from push events
    const pushEvents = events.filter((e) => e.type === "PushEvent");
    const uniqueRepos = [...new Set(pushEvents.map((e) => e.repo.name))];

    // Fetch commits for each repository
    for (const repoFullName of uniqueRepos) {
      const [owner, repo] = repoFullName.split("/");
      try {
        const commitsResponse = await octokit.rest.repos.listCommits({
          owner,
          repo,
          author: session.user.github_username,
          since: sinceDate,
          per_page: 100,
        });

        reposWithCommits.set(repoFullName, commitsResponse.data);

        // Update rate limit info with the most recent response
        rateLimitInfo = extractRateLimitInfo(
          commitsResponse.headers as Record<string, string>,
        );
      } catch (error) {
        console.error(`Failed to fetch commits for ${repoFullName}:`, error);
        // Continue with other repos even if one fails
      }
    }

    // Transform events to activities, enriching PushEvents with commit data from Commits API
    const activities = transformEventsToActivities(
      events,
      session.user.id,
      reposWithCommits,
    );

    // Upsert activities to database with deduplication
    let newCount = 0;
    const errors: string[] = [];

    for (const activity of activities) {
      try {
        // Check if activity already exists based on event_id
        const metadata = activity.metadata as { event_id?: string };
        const eventId = metadata.event_id;

        if (!eventId) {
          // Skip activities without event_id
          continue;
        }

        const { data: existing } = await supabaseAdmin
          .from("github_activities")
          .select("id")
          .eq("user_id", activity.user_id || "")
          .eq("metadata->>event_id", eventId)
          .maybeSingle();

        if (!existing) {
          // Insert new activity (using admin client to bypass RLS)
          const { error: insertError } = await supabaseAdmin
            .from("github_activities")
            .insert(activity);

          if (insertError) {
            console.error("Error inserting activity:", insertError);
            errors.push(`Failed to insert activity: ${activity.title}`);
          } else {
            newCount++;
          }
        } else {
          // Update synced_at for existing activity (using admin client to bypass RLS)
          const { error: updateError } = await supabaseAdmin
            .from("github_activities")
            .update({ synced_at: new Date().toISOString() })
            .eq("id", existing.id);

          if (updateError) {
            console.error("Error updating activity:", updateError);
          }
        }
      } catch (activityError) {
        console.error("Error processing activity:", activityError);
        errors.push(`Error processing activity: ${activity.title}`);
      }
    }

    return {
      success: true,
      newItemsCount: newCount,
      totalItems: activities.length,
      lastSyncedAt: new Date().toISOString(),
      rateLimitRemaining: rateLimitInfo.remaining,
      rateLimitReset: rateLimitInfo.reset,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  } catch (error: unknown) {
    console.error("Error syncing GitHub activity:", error);

    // Handle specific error types
    if (error && typeof error === "object" && "status" in error) {
      const apiError = error as {
        status: number;
        response?: { headers?: Record<string, string> };
      };

      if (apiError.status === 401) {
        return {
          success: false,
          newItemsCount: 0,
          totalItems: 0,
          lastSyncedAt: new Date().toISOString(),
          rateLimitRemaining: 0,
          rateLimitReset: new Date().toISOString(),
          error: "Token expired - please sign in again",
        };
      }

      if (apiError.status === 403) {
        const rateLimitInfo = extractRateLimitInfo(
          (apiError.response?.headers || {}) as Record<string, string>,
        );
        return {
          success: false,
          newItemsCount: 0,
          totalItems: 0,
          lastSyncedAt: new Date().toISOString(),
          rateLimitRemaining: rateLimitInfo.remaining,
          rateLimitReset: rateLimitInfo.reset,
          error: "Rate limited - please try again later",
        };
      }
    }

    return {
      success: false,
      newItemsCount: 0,
      totalItems: 0,
      lastSyncedAt: new Date().toISOString(),
      rateLimitRemaining: 0,
      rateLimitReset: new Date().toISOString(),
      error: "Failed to sync activities",
    };
  }
}
