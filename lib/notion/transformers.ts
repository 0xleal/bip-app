import type {
  NotionPage,
  NotionDatabase,
  NotionActivityInsert,
} from "./types";

/**
 * Extract title from Notion page properties
 *
 * Notion pages have different property types, we need to find the title property
 */
function extractPageTitle(properties: Record<string, unknown>): string {
  // Look for a property with type 'title'
  for (const [, value] of Object.entries(properties)) {
    const prop = value as {
      type?: string;
      title?: Array<{ plain_text?: string }>;
    };

    if (prop.type === "title" && Array.isArray(prop.title)) {
      const titleParts = prop.title
        .map((t) => t.plain_text || "")
        .filter(Boolean);
      if (titleParts.length > 0) {
        return titleParts.join("");
      }
    }
  }

  return "Untitled";
}

/**
 * Extract title from Notion database
 */
function extractDatabaseTitle(database: NotionDatabase): string {
  if (database.title && database.title.length > 0) {
    return database.title.map((t) => t.text.content).join("");
  }
  return "Untitled Database";
}

/**
 * Determine activity type based on timestamps
 */
function determineActivityType(
  createdTime: string,
  lastEditedTime: string,
  objectType: "page" | "database"
): string {
  const created = new Date(createdTime);
  const edited = new Date(lastEditedTime);

  // If edited within 1 minute of creation, consider it a create
  const timeDiff = edited.getTime() - created.getTime();
  const isCreate = timeDiff < 60 * 1000;

  if (objectType === "page") {
    return isCreate ? "page_create" : "page_edit";
  } else {
    return isCreate ? "database_create" : "database_edit";
  }
}

/**
 * Transform a Notion page to our activity schema
 */
export function transformPageToActivity(
  page: NotionPage,
  userId: string
): NotionActivityInsert | null {
  try {
    const title = extractPageTitle(page.properties);
    const activityType = determineActivityType(
      page.created_time,
      page.last_edited_time,
      "page"
    );

    // Determine parent type and ID
    let parentType: string;
    let parentId: string | null = null;

    if (page.parent.type === "workspace") {
      parentType = "workspace";
    } else if (page.parent.type === "page_id") {
      parentType = "page_id";
      parentId = page.parent.page_id;
    } else {
      parentType = "database_id";
      parentId = page.parent.database_id;
    }

    return {
      user_id: userId,
      provider: "notion",
      activity_type: activityType,
      title: title,
      description: `${activityType === "page_create" ? "Created" : "Edited"} page`,
      url: page.url,
      metadata: {
        notion_page_id: page.id,
        object_type: "page",
        parent_type: parentType,
        parent_id: parentId,
        archived: page.archived,
        in_trash: page.in_trash,
        created_by_id: page.created_by.id,
        last_edited_by_id: page.last_edited_by.id,
      },
      occurred_at: page.last_edited_time,
    };
  } catch (error) {
    console.error("Error transforming page to activity:", error);
    return null;
  }
}

/**
 * Transform a Notion database to our activity schema
 */
export function transformDatabaseToActivity(
  database: NotionDatabase,
  userId: string
): NotionActivityInsert | null {
  try {
    const title = extractDatabaseTitle(database);
    const activityType = determineActivityType(
      database.created_time,
      database.last_edited_time,
      "database"
    );

    // Determine parent type and ID
    let parentType: string;
    let parentId: string | null = null;

    if (database.parent.type === "workspace") {
      parentType = "workspace";
    } else {
      parentType = "page_id";
      parentId = database.parent.page_id;
    }

    return {
      user_id: userId,
      provider: "notion",
      activity_type: activityType,
      title: title,
      description: `${activityType === "database_create" ? "Created" : "Edited"} database`,
      url: database.url,
      metadata: {
        notion_page_id: database.id, // Databases also use page_id in Notion
        object_type: "database",
        parent_type: parentType,
        parent_id: parentId,
        archived: database.archived,
        in_trash: database.in_trash,
        created_by_id: database.created_by.id,
        last_edited_by_id: database.last_edited_by.id,
      },
      occurred_at: database.last_edited_time,
    };
  } catch (error) {
    console.error("Error transforming database to activity:", error);
    return null;
  }
}

/**
 * Transform Notion search results to activities
 *
 * Filters and transforms both pages and databases
 */
export function transformSearchResultsToActivities(
  results: Array<NotionPage | NotionDatabase>,
  userId: string,
  workspaceUserId: string,
  dateThreshold: Date
): NotionActivityInsert[] {
  const activities: NotionActivityInsert[] = [];

  for (const item of results) {
    // Filter by user (must be edited by the authenticated user)
    if (item.last_edited_by.id !== workspaceUserId) {
      continue;
    }

    // Filter by date
    const editedTime = new Date(item.last_edited_time);
    if (editedTime < dateThreshold) {
      continue;
    }

    // Skip archived or trashed items
    if (item.archived || item.in_trash) {
      continue;
    }

    // Transform based on object type
    let activity: NotionActivityInsert | null = null;

    if (item.object === "page") {
      activity = transformPageToActivity(item as NotionPage, userId);
    } else if (item.object === "database") {
      activity = transformDatabaseToActivity(item as NotionDatabase, userId);
    }

    if (activity) {
      activities.push(activity);
    }
  }

  return activities;
}
