import type { Database } from "@/types/supabase";

/**
 * Notion API response types
 */

export interface NotionUser {
  object: "user";
  id: string;
  type: "person" | "bot";
  name: string;
  avatar_url: string | null;
  person?: {
    email: string;
  };
}

export interface NotionPage {
  object: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: "user";
    id: string;
  };
  last_edited_by: {
    object: "user";
    id: string;
  };
  archived: boolean;
  in_trash: boolean;
  url: string;
  public_url: string | null;
  properties: Record<string, unknown>;
  parent:
    | { type: "workspace"; workspace: true }
    | { type: "page_id"; page_id: string }
    | { type: "database_id"; database_id: string };
}

export interface NotionDatabase {
  object: "database";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: "user";
    id: string;
  };
  last_edited_by: {
    object: "user";
    id: string;
  };
  archived: boolean;
  in_trash: boolean;
  url: string;
  public_url: string | null;
  title: Array<{
    type: "text";
    text: { content: string };
  }>;
  properties: Record<string, unknown>;
  parent:
    | { type: "workspace"; workspace: true }
    | { type: "page_id"; page_id: string };
}

export interface NotionSearchResponse {
  object: "list";
  results: Array<NotionPage | NotionDatabase>;
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotionMeResponse {
  object: "user";
  id: string;
  type: "bot";
  bot: {
    owner: {
      type: "user";
      user: NotionUser;
    };
    workspace_name?: string;
  };
  workspace_id?: string;
  workspace_name?: string;
}

/**
 * Application types for Notion integration
 */

export type NotionActivityInsert =
  Database["public"]["Tables"]["notion_activities"]["Insert"];

export interface SyncNotionResult {
  success: boolean;
  newItemsCount?: number;
  totalItems?: number;
  lastSyncedAt: string;
  error?: string;
}

export interface GetNotionActivitiesOptions {
  dateRange?: "24h" | "7d" | "30d" | "custom";
  customStartDate?: string;
}

export interface GetNotionActivitiesResult {
  activities?: Array<Database["public"]["Tables"]["notion_activities"]["Row"]>;
  error?: string;
}
