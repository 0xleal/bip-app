import type { Database } from "@/types/supabase";

export type GitHubActivity =
  Database["public"]["Tables"]["github_activities"]["Row"];
export type ManualNote = Database["public"]["Tables"]["manual_notes"]["Row"];

export interface ContentSuggestion {
  hook: string;
  body: string;
  optional?: string;
  tone: "conversational" | "technical" | "reflective";
  format:
    | "single-tweet"
    | "thread-starter"
    | "code-snippet"
    | "til"
    | "before-after"
    | "screenshot"
    // Legacy formats for backwards compatibility
    | "short-post"
    | "thread";
  charCount?: number;
}

export interface GeneratedContent {
  suggestions: ContentSuggestion[];
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
}

export interface FormattedInput {
  activities: Array<{
    type: string;
    title: string;
    description?: string;
    timestamp: string;
    repo?: string;
    url?: string;
  }>;
  notes: Array<{
    content: string;
    timestamp: string;
  }>;
  dateRange: string;
}
