/**
 * Notion API client utilities
 *
 * Mirrors the GitHub client pattern but for Notion's API
 */

const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE_URL = "https://api.notion.com/v1";

export interface NotionClientConfig {
  accessToken: string;
}

/**
 * Create headers for Notion API requests
 *
 * @param accessToken - Notion OAuth access token
 * @returns Headers object for fetch requests
 */
export function createNotionHeaders(accessToken: string): HeadersInit {
  if (!accessToken) {
    throw new Error("Notion access token is required");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": NOTION_API_VERSION,
    "Content-Type": "application/json",
  };
}

/**
 * Make a GET request to Notion API
 */
export async function notionGet(
  endpoint: string,
  accessToken: string
): Promise<Response> {
  const url = `${NOTION_BASE_URL}${endpoint}`;
  const headers = createNotionHeaders(accessToken);

  return fetch(url, {
    method: "GET",
    headers,
  });
}

/**
 * Make a POST request to Notion API
 */
export async function notionPost(
  endpoint: string,
  accessToken: string,
  body?: object
): Promise<Response> {
  const url = `${NOTION_BASE_URL}${endpoint}`;
  const headers = createNotionHeaders(accessToken);

  return fetch(url, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Extract rate limit information from Notion API response headers
 *
 * @param headers - Response headers from Notion API
 * @returns Retry delay in seconds if rate limited, otherwise null
 */
export function extractNotionRateLimitInfo(headers: Headers): number | null {
  const retryAfter = headers.get("retry-after");

  if (retryAfter) {
    // Retry-After is in seconds (can be decimal)
    return parseFloat(retryAfter);
  }

  return null;
}

/**
 * Handle rate limiting with exponential backoff
 *
 * @param retryAfter - Seconds to wait before retrying
 */
export async function waitForRateLimit(retryAfter: number): Promise<void> {
  const delayMs = Math.max(retryAfter * 1000, 1000); // Minimum 1 second
  console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
