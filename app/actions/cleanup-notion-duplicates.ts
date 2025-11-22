"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";

/**
 * One-time cleanup function to remove duplicate Notion activities
 * Keeps only the most recent entry per page
 */
export async function cleanupNotionDuplicates(): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Step 1: Get all activities for this user grouped by notion_page_id
    const { data: activities, error: fetchError } = await supabaseAdmin
      .from("notion_activities")
      .select("id, metadata, occurred_at, created_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching activities:", fetchError);
      return { success: false, error: "Failed to fetch activities" };
    }

    if (!activities || activities.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Step 2: Group by notion_page_id and identify duplicates
    const pageGroups = new Map<string, typeof activities>();

    for (const activity of activities) {
      const metadata = activity.metadata as { notion_page_id?: string };
      const pageId = metadata?.notion_page_id;

      if (!pageId) continue;

      if (!pageGroups.has(pageId)) {
        pageGroups.set(pageId, []);
      }
      pageGroups.get(pageId)!.push(activity);
    }

    // Step 3: For each page with duplicates, keep only the most recent
    const idsToDelete: string[] = [];

    for (const [pageId, group] of pageGroups) {
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

    // Step 4: Delete duplicates
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("notion_activities")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Error deleting duplicates:", deleteError);
        return { success: false, error: "Failed to delete duplicates" };
      }
    }

    return {
      success: true,
      deletedCount: idsToDelete.length,
    };
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
