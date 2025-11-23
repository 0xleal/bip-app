import axios from "axios";
import * as cheerio from "cheerio";
import type { TweetData } from "./types";

/**
 * Twitter oEmbed Service
 * Fetches tweet content using Twitter's oEmbed API without requiring authentication
 */
export class TwitterOEmbedService {
  private readonly oEmbedBaseUrl = "https://publish.twitter.com/oembed";

  /**
   * Fetch tweet content using Twitter/X oEmbed API
   */
  async fetchTweet(url: string): Promise<TweetData> {
    try {
      // Validate URL format
      if (!this.isValidTwitterUrl(url)) {
        throw new Error("Invalid Twitter/X URL format");
      }

      // Fetch oEmbed data
      const oEmbedUrl = `${this.oEmbedBaseUrl}?url=${encodeURIComponent(url)}`;
      const response = await axios.get(oEmbedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        timeout: 10000,
      });

      const { html, author_name } = response.data;

      // Extract tweet text from HTML
      const tweetText = this.extractTextFromHtml(html);

      return {
        text: tweetText,
        author: author_name,
        url: url,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(
            "Tweet not found. It may be deleted, private, or the URL is invalid.",
          );
        }
        throw new Error(`Failed to fetch tweet: ${error.message}`);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to fetch tweet: Unknown error");
    }
  }

  /**
   * Fetch multiple tweets concurrently
   */
  async fetchTweets(urls: string[]): Promise<TweetData[]> {
    const promises = urls.map((url) => this.fetchTweet(url));
    return Promise.all(promises);
  }

  /**
   * Validate Twitter/X URL format
   */
  private isValidTwitterUrl(url: string): boolean {
    const patterns = [
      /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/,
      /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/,
    ];
    return patterns.some((pattern) => pattern.test(url));
  }

  /**
   * Extract clean text from oEmbed HTML
   */
  private extractTextFromHtml(html: string): string {
    try {
      const $ = cheerio.load(html);

      // Find the paragraph containing the tweet text
      const tweetParagraph = $("blockquote.twitter-tweet p").first();

      if (tweetParagraph.length === 0) {
        // Fallback: try regex extraction
        const textMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (textMatch) {
          return this.cleanText(textMatch[1]);
        }
        throw new Error("Could not find tweet text in HTML");
      }

      // Get the HTML content and clean it
      const tweetHtml = tweetParagraph.html() || "";
      return this.cleanText(tweetHtml);
    } catch (error) {
      throw new Error("Failed to extract tweet text from HTML");
    }
  }

  /**
   * Clean HTML and convert to plain text
   */
  private cleanText(html: string): string {
    // Replace <br> tags with newlines
    let text = html.replace(/<br\s*\/?>/gi, "\n");

    // Remove HTML tags but keep text content
    text = text.replace(/<[^>]+>/g, "");

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&mdash;/g, "—")
      .replace(/&hellip;/g, "…");

    // Clean up whitespace
    text = text
      .replace(/\n\s*\n/g, "\n") // Multiple newlines to single
      .replace(/[ \t]+/g, " ") // Multiple spaces to single
      .trim();

    return text;
  }
}

// Export a singleton instance
export const twitterService = new TwitterOEmbedService();
