import { Octokit } from "@octokit/rest";

/**
 * Create a GitHub API client with the provided access token
 *
 * @param accessToken - GitHub OAuth access token
 * @returns Configured Octokit instance
 */
export function createGitHubClient(accessToken: string): Octokit {
  if (!accessToken) {
    throw new Error("GitHub access token is required");
  }

  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Extract rate limit information from GitHub API response headers
 *
 * @param headers - Response headers from GitHub API
 * @returns Rate limit info
 */
export function extractRateLimitInfo(
  headers: Record<string, string | undefined>
) {
  const remaining = parseInt(headers["x-ratelimit-remaining"] || "0", 10);
  const resetTimestamp = headers["x-ratelimit-reset"];
  const resetDate = resetTimestamp
    ? new Date(parseInt(resetTimestamp, 10) * 1000).toISOString()
    : new Date().toISOString();

  return {
    remaining,
    reset: resetDate,
    isLimited: remaining < 100,
  };
}
