/**
 * GitHub OAuth token refresh utilities
 */

interface GitHubTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Refresh a GitHub access token using a refresh token
 *
 * @param refreshToken - The GitHub refresh token
 * @returns New access token and refresh token
 */
export async function refreshGitHubAccessToken(
  refreshToken: string
): Promise<GitHubTokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh GitHub token: ${error}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub token refresh error: ${data.error_description || data.error}`);
  }

  return data;
}

/**
 * Check if a token is expired or expiring soon (within 5 minutes)
 *
 * @param expiresAt - ISO timestamp of when the token expires
 * @returns True if token is expired or expiring soon
 */
export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;

  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  return expirationTime - now < fiveMinutes;
}

/**
 * Calculate token expiration timestamp from expires_in seconds
 *
 * @param expiresIn - Number of seconds until token expires
 * @returns ISO timestamp of expiration time
 */
export function calculateTokenExpiration(expiresIn: number): string {
  const now = new Date();
  const expirationTime = new Date(now.getTime() + expiresIn * 1000);
  return expirationTime.toISOString();
}
