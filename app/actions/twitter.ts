"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";
import { twitterService } from "@/lib/twitter/client";
import { analyzeToneOfVoice } from "@/lib/twitter/analyzer";
import type {
  ToneOfVoiceGuide,
  FetchTweetResult,
  AnalyzeToneResult,
} from "@/lib/twitter/types";
import type { Json } from "@/types/supabase";

/**
 * Fetch a single tweet from Twitter using oEmbed API
 */
export async function fetchTweet(url: string): Promise<FetchTweetResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized - please sign in" };
    }

    const tweet = await twitterService.fetchTweet(url);

    return { success: true, tweet };
  } catch (error) {
    console.error("Error fetching tweet:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to fetch tweet" };
  }
}

/**
 * Analyze tweets and generate tone of voice guide
 * Stores the result in the user's profile
 */
export async function generateToneOfVoice(
  tweetUrls: string[],
): Promise<AnalyzeToneResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized - please sign in" };
    }

    // Validate input
    if (!tweetUrls || tweetUrls.length < 1) {
      return {
        success: false,
        error: "At least 1 tweet URL is required",
      };
    }

    if (tweetUrls.length > 10) {
      return {
        success: false,
        error: "Maximum 10 tweets allowed",
      };
    }

    // Fetch all tweets
    const tweets = await twitterService.fetchTweets(tweetUrls);

    // Analyze tone of voice
    const toneOfVoice = await analyzeToneOfVoice(tweets);

    // Store in user profile
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        twitter_tone_of_voice: toneOfVoice as unknown as Json,
        twitter_tone_of_voice_updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (updateError) {
      console.error("Error updating user tone of voice:", updateError);
      return { success: false, error: "Failed to save tone of voice" };
    }

    return { success: true, toneOfVoice };
  } catch (error) {
    console.error("Error generating tone of voice:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to generate tone of voice" };
  }
}

/**
 * Get the user's stored tone of voice guide
 */
export async function getToneOfVoice(): Promise<AnalyzeToneResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized - please sign in" };
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("twitter_tone_of_voice, twitter_tone_of_voice_updated_at")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching tone of voice:", error);
      return { success: false, error: "Failed to fetch tone of voice" };
    }

    if (!data.twitter_tone_of_voice) {
      return { success: false, error: "No tone of voice guide found" };
    }

    return {
      success: true,
      toneOfVoice: data.twitter_tone_of_voice as unknown as ToneOfVoiceGuide,
    };
  } catch (error) {
    console.error("Error getting tone of voice:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to get tone of voice" };
  }
}

/**
 * Delete the user's tone of voice guide
 */
export async function deleteToneOfVoice(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized - please sign in" };
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        twitter_tone_of_voice: null,
        twitter_tone_of_voice_updated_at: null,
      })
      .eq("id", session.user.id);

    if (error) {
      console.error("Error deleting tone of voice:", error);
      return { success: false, error: "Failed to delete tone of voice" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting tone of voice:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to delete tone of voice" };
  }
}
