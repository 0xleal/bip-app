/**
 * Notion API client utilities
 *
 * Uses the official @notionhq/client SDK
 */

import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

export interface NotionClientConfig {
  accessToken: string;
}

/**
 * Create a Notion client instance
 *
 * @param accessToken - Notion OAuth access token
 * @returns Notion client instance
 */
export function createNotionClient(accessToken: string): Client {
  if (!accessToken) {
    throw new Error("Notion access token is required");
  }

  return new Client({ auth: accessToken });
}

/**
 * Type guard to check if block is a full block (not partial)
 */
function isFullBlock(
  block: BlockObjectResponse | PartialBlockObjectResponse,
): block is BlockObjectResponse {
  return "type" in block;
}

/**
 * Extract plain text from a rich text array
 */
function extractPlainTextFromRichText(
  richText: Array<{ plain_text: string }>,
): string {
  return richText.map((item) => item.plain_text).join("");
}

/**
 * Extract plain text from a block based on its type
 */
function extractPlainTextFromBlock(block: BlockObjectResponse): string {
  const blockType = block.type;

  // Handle different block types using the SDK's type system
  switch (blockType) {
    case "paragraph":
      return extractPlainTextFromRichText(block.paragraph.rich_text);
    case "heading_1":
      return extractPlainTextFromRichText(block.heading_1.rich_text);
    case "heading_2":
      return extractPlainTextFromRichText(block.heading_2.rich_text);
    case "heading_3":
      return extractPlainTextFromRichText(block.heading_3.rich_text);
    case "bulleted_list_item":
      return extractPlainTextFromRichText(block.bulleted_list_item.rich_text);
    case "numbered_list_item":
      return extractPlainTextFromRichText(block.numbered_list_item.rich_text);
    case "to_do":
      return extractPlainTextFromRichText(block.to_do.rich_text);
    case "toggle":
      return extractPlainTextFromRichText(block.toggle.rich_text);
    case "quote":
      return extractPlainTextFromRichText(block.quote.rich_text);
    case "callout":
      return extractPlainTextFromRichText(block.callout.rich_text);
    case "code":
      return extractPlainTextFromRichText(block.code.rich_text);
    case "child_page":
      return block.child_page.title;
    case "child_database":
      return block.child_database.title;
    case "equation":
      return block.equation.expression;
    case "table_row":
      return block.table_row.cells
        .map((cell) => extractPlainTextFromRichText(cell))
        .join(" | ");
    default:
      // Blocks without text content (divider, breadcrumb, etc.)
      return "";
  }
}

/**
 * Fetch all blocks (content) from a Notion page and extract plain text
 * Uses the official Notion SDK with pagination support
 *
 * @param pageId - The Notion page ID
 * @param accessToken - Notion OAuth access token
 * @returns Plain text content from the page
 */
export async function fetchPageContent(
  pageId: string,
  accessToken: string,
): Promise<string> {
  const notion = createNotionClient(accessToken);
  const textParts: string[] = [];

  try {
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: startCursor,
        page_size: 100,
      });

      // Extract text from each block
      for (const block of response.results) {
        if (isFullBlock(block)) {
          const text = extractPlainTextFromBlock(block);
          if (text.trim()) {
            textParts.push(text);
          }
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }
  } catch (error) {
    console.error(`Error fetching content for page ${pageId}:`, error);
  }

  return textParts.join("\n\n");
}
