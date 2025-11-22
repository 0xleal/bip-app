"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/client";
import { noteSchema, noteIdSchema } from "@/lib/validations";
import type {
  CreateNoteResult,
  GetNotesResult,
  DeleteNoteResult,
  GetNotesOptions,
} from "@/lib/notes/types";

/**
 * Calculate date threshold for date range filtering
 */
function calculateDateThreshold(
  dateRange: "24h" | "7d" | "30d" | "custom",
  customStartDate?: string,
): string {
  if (dateRange === "custom" && customStartDate) {
    return customStartDate;
  }

  const now = new Date();
  const thresholds = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    custom: 0,
  };

  const threshold = new Date(now.getTime() - thresholds[dateRange]);
  return threshold.toISOString();
}

/**
 * Create a new manual note
 *
 * Server Action to create a note with validation
 */
export async function createNote(content: string): Promise<CreateNoteResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { error: "Unauthorized - please sign in" };
    }

    // Validate input with Zod
    const validation = noteSchema.safeParse({ content });

    if (!validation.success) {
      return {
        error: validation.error.issues[0]?.message || "Invalid note content",
      };
    }

    // Insert note into database (using admin client to bypass RLS)
    const { data, error } = await supabaseAdmin
      .from("manual_notes")
      .insert({
        user_id: session.user.id,
        content: validation.data.content,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return { error: "Failed to create note" };
    }

    return { note: data };
  } catch (error) {
    console.error("Unexpected error in createNote:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Get user's manual notes
 *
 * Server Action to fetch notes with optional date filtering
 */
export async function getNotes(
  options: GetNotesOptions = {},
): Promise<GetNotesResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { error: "Unauthorized - please sign in" };
    }

    const { dateRange = "30d", customStartDate } = options;

    // Calculate date threshold if filtering by date
    const threshold = calculateDateThreshold(dateRange, customStartDate);

    // Query database (using admin client since we validate auth at application level)
    const { data, error } = await supabaseAdmin
      .from("manual_notes")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("created_at", threshold)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return { error: "Failed to fetch notes" };
    }

    return { notes: data || [] };
  } catch (error) {
    console.error("Unexpected error in getNotes:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Delete a manual note
 *
 * Server Action to delete a note with validation
 */
export async function deleteNote(noteId: string): Promise<DeleteNoteResult> {
  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized - please sign in" };
    }

    // Validate input with Zod
    const validation = noteIdSchema.safeParse({ id: noteId });

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid note ID",
      };
    }

    // Delete note from database (using admin client to bypass RLS)
    // RLS ensures user can only delete their own notes
    const { error } = await supabaseAdmin
      .from("manual_notes")
      .delete()
      .eq("id", validation.data.id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting note:", error);
      return { success: false, error: "Failed to delete note" };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in deleteNote:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
