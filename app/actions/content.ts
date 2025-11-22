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
  endDate?: string
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
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from("github_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: false });

    if (activitiesError) {
      console.error("Error fetching activities:", activitiesError);
      return {
        success: false,
        error: "Failed to fetch GitHub activities",
      };
    }

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

    // Transform activities for AI input
    const formattedActivities = (activities || []).map((activity) => ({
      type: activity.activity_type,
      title: activity.title,
      description: activity.description || undefined,
      timestamp: activity.occurred_at,
      repo: activity.repo_name || undefined,
      url: activity.url || undefined,
    }));

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
