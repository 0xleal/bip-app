"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseAdmin } from "@/lib/supabase/client";
import { generateContent } from "@/lib/ai/client";
import { checkRateLimit, incrementUsage, getUserUsage } from "@/lib/rate-limit";
import type { ContentSuggestion } from "@/lib/ai/types";
import type { RateLimitUsage } from "@/lib/rate-limit";

export interface GenerateContentResult {
  success: boolean;
  suggestions?: ContentSuggestion[];
  usage?: RateLimitUsage;
  error?: string;
}

export interface GetUsageResult {
  success: boolean;
  usage?: RateLimitUsage;
  error?: string;
}

export interface GetContentHistoryResult {
  success: boolean;
  history?: Array<{
    id: string;
    suggestions: ContentSuggestion[];
    createdAt: string;
  }>;
  error?: string;
}

/**
 * Generate shareable content from GitHub activities and manual notes
 * Includes rate limiting and cost controls
 */
export async function generateContentAction(
  dateRange: string,
  startDate?: string,
  endDate?: string,
): Promise<GenerateContentResult> {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be signed in to generate content",
      };
    }

    const userId = session.user.id;

    // Check rate limit FIRST
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.reason,
        usage: rateLimit.usage,
      };
    }

    // Calculate date range
    let start: Date;
    let end: Date = new Date();

    if (dateRange === "custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (dateRange === "24h") {
      start = new Date();
      start.setHours(start.getHours() - 24);
    } else if (dateRange === "7d") {
      start = new Date();
      start.setDate(start.getDate() - 7);
    } else if (dateRange === "30d") {
      start = new Date();
      start.setDate(start.getDate() - 30);
    } else {
      return {
        success: false,
        error: "Invalid date range",
      };
    }

    // Fetch GitHub activities from database
    const { data: githubActivities, error: githubError } = await supabaseAdmin
      .from("github_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: false });

    if (githubError) {
      console.error("Error fetching GitHub activities:", githubError);
      return {
        success: false,
        error: "Failed to fetch GitHub activities",
      };
    }

    // Fetch Notion activities from database
    const { data: notionActivities, error: notionError } = await supabaseAdmin
      .from("notion_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: false });

    if (notionError) {
      console.error("Error fetching Notion activities:", notionError);
      // Don't fail if Notion activities fail, just log and continue
    }

    // Combine all activities
    const activities = [
      ...(githubActivities || []),
      ...(notionActivities || []),
    ].sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

    // Fetch manual notes from database
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("manual_notes")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (notesError) {
      console.error("Error fetching notes:", notesError);
      return {
        success: false,
        error: "Failed to fetch manual notes",
      };
    }

    // Check if there's any data to generate content from
    if (!activities?.length && !notes?.length) {
      return {
        success: false,
        error:
          "No activity or notes found for the selected date range. Add some notes or sync your GitHub activity first.",
      };
    }

    // Fetch user's tone of voice guide
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("twitter_tone_of_voice")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
    }

    const toneOfVoice = userData?.twitter_tone_of_voice;

    // Transform activities for AI input (both GitHub and Notion)
    const formattedActivities = (activities || []).map((activity) => {
      const formatted: {
        type: string;
        title: string;
        description?: string;
        timestamp: string;
        provider?: string;
        repo?: string;
        url?: string;
        metadata?: Record<string, unknown>;
      } = {
        type: activity.activity_type,
        title: activity.title,
        description: activity.description || undefined,
        timestamp: activity.occurred_at,
        provider: activity.provider || "github",
        url: activity.url || undefined,
      };

      // Only add repo if it exists (GitHub activities have this)
      if ("repo_name" in activity && activity.repo_name) {
        formatted.repo = activity.repo_name as string;
      }

      // Include metadata for Notion activities (page content, properties, etc.)
      if ("metadata" in activity && activity.metadata) {
        formatted.metadata = activity.metadata as Record<string, unknown>;
      }

      return formatted;
    });

    // Transform notes for AI input
    const formattedNotes = (notes || []).map((note) => ({
      content: note.content,
      timestamp: note.created_at || new Date().toISOString(),
    }));

    // Generate content using Anthropic API
    const generated = await generateContent({
      activities: formattedActivities,
      notes: formattedNotes,
      dateRange,
      toneOfVoice: toneOfVoice || undefined,
    });

    // Save generated content to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceData: any = {
      dateRange,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      activityCount: formattedActivities.length,
      noteCount: formattedNotes.length,
      activityIds: activities?.map((a) => a.id) || [],
      noteIds: notes?.map((n) => n.id) || [],
      promptVersion: generated.promptVersion,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suggestionsData: any = generated.suggestions;

    const { error: saveError } = await supabaseAdmin
      .from("generated_content")
      .insert({
        user_id: userId,
        source_data: sourceData,
        suggestions: suggestionsData,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving generated content:", saveError);
      // Don't fail the request, just log the error
    }

    // Increment usage counter
    await incrementUsage(userId);

    // Get updated usage
    const updatedUsage = await getUserUsage(userId);

    return {
      success: true,
      suggestions: generated.suggestions,
      usage: updatedUsage,
    };
  } catch (error) {
    console.error("Error in generateContentAction:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate content. Please try again.",
    };
  }
}

/**
 * Get current usage/quota information for the authenticated user
 */
export async function getUserQuotaAction(): Promise<GetUsageResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be signed in",
      };
    }

    const usage = await getUserUsage(session.user.id);

    return {
      success: true,
      usage,
    };
  } catch (error) {
    console.error("Error getting user quota:", error);
    return {
      success: false,
      error: "Failed to get usage information",
    };
  }
}

/**
 * Get content generation history for the authenticated user
 * Returns the last 10 generated content items
 */
export async function getContentHistoryAction(): Promise<GetContentHistoryResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be signed in",
      };
    }

    const { data, error } = await supabaseAdmin
      .from("generated_content")
      .select("id, suggestions, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching content history:", error);
      return {
        success: false,
        error: "Failed to fetch content history",
      };
    }

    return {
      success: true,
      history: data?.map((item) => ({
        id: item.id,
        suggestions: item.suggestions as unknown as ContentSuggestion[],
        createdAt: item.created_at || new Date().toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error in getContentHistoryAction:", error);
    return {
      success: false,
      error: "Failed to fetch content history",
    };
  }
}
