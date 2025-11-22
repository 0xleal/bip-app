import { supabaseAdmin } from "@/lib/supabase/client";
import type { RateLimitCheck, RateLimitConfig, RateLimitUsage } from "./types";
import { DEFAULT_RATE_LIMITS } from "./types";

/**
 * Get the start and end timestamps for daily and weekly periods
 */
function getPeriodBounds() {
  const now = new Date();

  // Daily period: last 24 hours
  const dailyStart = new Date(now);
  dailyStart.setHours(0, 0, 0, 0);
  const dailyEnd = new Date(dailyStart);
  dailyEnd.setDate(dailyEnd.getDate() + 1);

  // Weekly period: last 7 days (rolling window)
  const weeklyStart = new Date(now);
  weeklyStart.setDate(weeklyStart.getDate() - 7);
  const weeklyEnd = new Date(now);

  return {
    dailyStart,
    dailyEnd,
    weeklyStart,
    weeklyEnd,
  };
}

/**
 * Check if user has exceeded their rate limits
 * @param userId - The user's ID
 * @param config - Rate limit configuration (optional, uses defaults if not provided)
 * @returns Rate limit check result with usage information
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): Promise<RateLimitCheck> {
  const now = new Date();
  const { dailyStart, dailyEnd, weeklyStart, weeklyEnd } = getPeriodBounds();

  try {
    // Query daily usage - get all records and sum them
    const { data: dailyUsages, error: dailyError } = await supabaseAdmin
      .from("ai_generation_usage")
      .select("generation_count")
      .eq("user_id", userId)
      .eq("period_start", dailyStart.toISOString())
      .eq("period_end", dailyEnd.toISOString());

    if (dailyError) {
      throw dailyError;
    }

    // Sum all records for today (in case there are duplicates)
    const dailyCount =
      dailyUsages?.reduce((sum, record) => sum + record.generation_count, 0) ||
      0;

    // Query weekly usage
    const { data: weeklyUsageRecords, error: weeklyError } = await supabaseAdmin
      .from("ai_generation_usage")
      .select("generation_count")
      .eq("user_id", userId)
      .gte("created_at", weeklyStart.toISOString());

    if (weeklyError) {
      throw weeklyError;
    }

    const weeklyCount =
      weeklyUsageRecords?.reduce(
        (sum, record) => sum + record.generation_count,
        0,
      ) || 0;

    const usage: RateLimitUsage = {
      dailyCount,
      weeklyCount,
      dailyRemaining: Math.max(0, config.dailyLimit - dailyCount),
      weeklyRemaining: Math.max(0, config.weeklyLimit - weeklyCount),
      dailyResetAt: dailyEnd,
      weeklyResetAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    };

    // Check if limits exceeded
    if (dailyCount >= config.dailyLimit) {
      return {
        allowed: false,
        usage,
        reason: `Daily limit of ${
          config.dailyLimit
        } generations exceeded. Resets at ${dailyEnd.toLocaleTimeString()}.`,
      };
    }

    if (weeklyCount >= config.weeklyLimit) {
      return {
        allowed: false,
        usage,
        reason: `Weekly limit of ${
          config.weeklyLimit
        } generations exceeded. Resets in ${Math.ceil(
          (weeklyEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )} days.`,
      };
    }

    return {
      allowed: true,
      usage,
    };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    throw new Error("Failed to check rate limit");
  }
}

/**
 * Increment the usage counter for a user
 * @param userId - The user's ID
 */
export async function incrementUsage(userId: string): Promise<void> {
  const { dailyStart, dailyEnd } = getPeriodBounds();

  try {
    // Check if a record exists for today - get all matching records
    const { data: existingUsages, error: fetchError } = await supabaseAdmin
      .from("ai_generation_usage")
      .select("id, generation_count")
      .eq("user_id", userId)
      .eq("period_start", dailyStart.toISOString())
      .eq("period_end", dailyEnd.toISOString())
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching existing usage:", fetchError);
      throw fetchError;
    }

    // Use the most recent record if multiple exist (shouldn't happen, but handle it)
    const existingUsage =
      existingUsages && existingUsages.length > 0 ? existingUsages[0] : null;

    if (existingUsage) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from("ai_generation_usage")
        .update({
          generation_count: existingUsage.generation_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUsage.id);

      if (updateError) {
        console.error("Error updating usage:", updateError);
        throw updateError;
      }
    } else {
      // Create new record for today
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from("ai_generation_usage")
        .insert({
          user_id: userId,
          generation_count: 1,
          period_start: dailyStart.toISOString(),
          period_end: dailyEnd.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting usage:", insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error("Error incrementing usage:", error);
    throw new Error("Failed to increment usage counter");
  }
}

/**
 * Get current usage for a user without checking limits
 * @param userId - The user's ID
 * @returns Current usage information
 */
export async function getUserUsage(
  userId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
): Promise<RateLimitUsage> {
  const { dailyStart, dailyEnd, weeklyStart } = getPeriodBounds();
  const now = new Date();

  try {
    const { data: dailyUsages, error: dailyError } = await supabaseAdmin
      .from("ai_generation_usage")
      .select("generation_count, period_start, period_end")
      .eq("user_id", userId)
      .eq("period_start", dailyStart.toISOString())
      .eq("period_end", dailyEnd.toISOString());

    if (dailyError) {
      console.error("Error fetching daily usage:", dailyError);
    }

    // Sum all records for today (in case there are duplicates)
    const dailyCount =
      dailyUsages?.reduce((sum, record) => sum + record.generation_count, 0) ||
      0;

    // Query weekly usage
    const { data: weeklyUsageRecords, error: weeklyError } = await supabaseAdmin
      .from("ai_generation_usage")
      .select("generation_count")
      .eq("user_id", userId)
      .gte("created_at", weeklyStart.toISOString());

    if (weeklyError) {
      console.error("Error fetching weekly usage:", weeklyError);
    }

    const weeklyCount =
      weeklyUsageRecords?.reduce(
        (sum, record) => sum + record.generation_count,
        0,
      ) || 0;

    return {
      dailyCount,
      weeklyCount,
      dailyRemaining: Math.max(0, config.dailyLimit - dailyCount),
      weeklyRemaining: Math.max(0, config.weeklyLimit - weeklyCount),
      dailyResetAt: dailyEnd,
      weeklyResetAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    console.error("Error getting user usage:", error);
    throw new Error("Failed to get usage information");
  }
}
