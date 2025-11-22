import type { Tables, TablesInsert } from "@/types/supabase";

/**
 * GitHub Activity as stored in database
 */
export type GitHubActivity = Tables<"github_activities">;

/**
 * GitHub Activity for insertion into database
 */
export type GitHubActivityInsert = TablesInsert<"github_activities">;

/**
 * Date range options for filtering activities
 */
export type DateRange = "24h" | "7d" | "30d" | "custom";

/**
 * Activity type options
 */
export type ActivityType =
  | "commit"
  | "pr_created"
  | "pr_reviewed"
  | "star"
  | "issue";

/**
 * Result from syncing GitHub activities
 */
export interface SyncResult {
  success: boolean;
  newItemsCount: number;
  totalItems: number;
  lastSyncedAt: string;
  rateLimitRemaining: number;
  rateLimitReset: string;
  error?: string;
}

/**
 * Options for getting GitHub activities
 */
export interface GetActivitiesOptions {
  dateRange?: DateRange;
  activityTypes?: ActivityType[];
  customStartDate?: string;
  customEndDate?: string;
}

/**
 * Result from getting GitHub activities
 */
export interface GetActivitiesResult {
  activities?: GitHubActivity[];
  error?: string;
}
