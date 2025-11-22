import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  refreshGitHubAccessToken,
  calculateTokenExpiration,
} from "./token-refresh";
import type { Database } from "@/types/supabase";

/**
 * Notion OAuth token response structure
 * When using owner=user, Notion returns user info nested in the owner object
 */
interface NotionTokenResponse {
  access_token: string;
  bot_id: string;
  duplicated_template_id: string | null;
  owner: {
    type: "user";
    user: {
      id: string;
      name: string;
      avatar_url: string;
      type: string;
      person?: {
        email: string;
      };
    };
  };
  workspace_icon: string;
  workspace_id: string;
  workspace_name: string;
}

/**
 * Notion OAuth profile response type
 * This is constructed from the token response owner.user data
 */
interface NotionProfile {
  id: string;
  name: string;
  avatar_url: string;
  email?: string;
  bot_id: string;
  workspace_id: string;
  workspace_name: string;
}

/**
 * Custom Notion OAuth provider for NextAuth
 * NextAuth doesn't have a built-in Notion provider, so we define it here
 */
function NotionProvider(options: {
  clientId: string;
  clientSecret: string;
  authorization: { params: { owner: string } };
}): OAuthConfig<NotionProfile> {
  return {
    id: "notion",
    name: "Notion",
    type: "oauth",
    version: "2.0",
    authorization: {
      url: "https://api.notion.com/v1/oauth/authorize",
      params: {
        client_id: options.clientId,
        response_type: "code",
        owner: options.authorization.params.owner,
      },
    },
    token: {
      url: "https://api.notion.com/v1/oauth/token",
      async request(context) {
        // Notion requires Basic auth with base64-encoded client_id:client_secret
        const credentials = Buffer.from(
          `${options.clientId}:${options.clientSecret}`
        ).toString("base64");

        const response = await fetch("https://api.notion.com/v1/oauth/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grant_type: "authorization_code",
            code: context.params.code,
            redirect_uri: context.provider.callbackUrl,
          }),
        });

        const data: NotionTokenResponse = await response.json();

        // Log for debugging
        if (!response.ok) {
          console.error("[Notion OAuth] Token exchange failed:", {
            status: response.status,
            statusText: response.statusText,
            error: data,
          });
          throw new Error(
            `Notion token exchange failed: ${JSON.stringify(data)}`
          );
        }

        // Extract user info from owner object (when owner=user)
        const userInfo = data.owner?.type === "user" ? data.owner.user : null;

        // Notion returns non-standard OAuth response
        // Transform it to what NextAuth expects, including user data
        return {
          tokens: {
            access_token: data.access_token,
            token_type: "Bearer",
            // User info from owner.user
            user_id: userInfo?.id,
            user_name: userInfo?.name,
            user_avatar: userInfo?.avatar_url,
            user_email: userInfo?.person?.email,
            // Workspace info
            bot_id: data.bot_id,
            workspace_id: data.workspace_id,
            workspace_name: data.workspace_name,
          },
        };
      },
    },
    userinfo: {
      // We don't actually need to call /users/me since we have all user data from token response
      // But NextAuth requires a userinfo config, so we return the data from tokens
      async request(context) {
        // Construct profile from token data (already extracted from owner.user)
        return {
          id: context.tokens.user_id as string,
          name: context.tokens.user_name as string,
          avatar_url: context.tokens.user_avatar as string,
          email: (context.tokens.user_email as string) || undefined,
          bot_id: context.tokens.bot_id as string,
          workspace_id: context.tokens.workspace_id as string,
          workspace_name: context.tokens.workspace_name as string,
        } as NotionProfile;
      },
    },
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile) {
      // profile is the data from userinfo which we constructed from token response
      // The `as unknown` cast is necessary because NextAuth's User type
      // expects github_id/github_username which Notion doesn't have
      return {
        id: profile.id, // Workspace user ID from owner.user.id
        name: profile.name,
        email: profile.email || null,
        image: profile.avatar_url,
        botId: profile.bot_id,
        workspaceId: profile.workspace_id,
        workspaceName: profile.workspace_name,
      } as unknown as ReturnType<OAuthConfig<NotionProfile>["profile"]>;
    },
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
    NotionProvider({
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
      authorization: {
        params: {
          owner: "user",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile, email }) {
      if (!account || !profile) return false;

      try {
        // Handle GitHub provider
        if (account.provider === "github") {
          const githubProfile = profile as {
            id?: number | string;
            login?: string;
            email?: string;
            name?: string;
            avatar_url?: string;
          };

          const githubId = githubProfile.id?.toString() || "";
          const githubUsername = githubProfile.login || "";
          const email = user.email || null;
          const name = user.name || null;
          const avatarUrl = user.image || null;

          // Calculate token expiration
          const tokenExpiresAt = account.expires_at
            ? new Date(account.expires_at * 1000).toISOString()
            : null;

          // Upsert user to Supabase
          const userData: Database["public"]["Tables"]["users"]["Insert"] = {
            github_id: githubId,
            github_username: githubUsername,
            email,
            name,
            avatar_url: avatarUrl,
            github_access_token: account.access_token || null,
            github_refresh_token: account.refresh_token || null,
            token_expires_at: tokenExpiresAt,
          };

          const { error } = await supabaseAdmin.from("users").upsert(userData, {
            onConflict: "github_id",
          });

          if (error) {
            console.error("Error upserting GitHub user to Supabase:", error);
            return false;
          }

          return true;
        }

        // Handle Notion provider
        if (account.provider === "notion") {
          const notionProfile = profile as NotionProfile & {
            botId?: string;
            workspaceId?: string;
            workspaceName?: string;
          };

          const notionWorkspaceUserId = user.id || ""; // From profile() mapping
          const email = user.email || null;
          const name = user.name || null;
          const avatarUrl = user.image || null;

          // For Notion, we need to find existing user
          // With owner=user, Notion provides email from owner.user.person.email
          let existingUser = null;

          // Strategy 1: Look up by email (should always be available with owner=user)
          if (email) {
            const { data, error: lookupError } = await supabaseAdmin
              .from("users")
              .select("id")
              .eq("email", email)
              .maybeSingle();

            if (lookupError) {
              console.error("Error looking up user by email:", lookupError);
            } else if (data) {
              existingUser = data;
            }
          }

          // Strategy 2: Check if they already have Notion connected
          if (!existingUser && notionWorkspaceUserId) {
            const { data, error: lookupError } = await supabaseAdmin
              .from("users")
              .select("id")
              .eq("notion_workspace_user_id", notionWorkspaceUserId)
              .maybeSingle();

            if (lookupError) {
              console.error("Error looking up user by Notion ID:", lookupError);
            } else if (data) {
              existingUser = data;
            }
          }

          const notionData: Database["public"]["Tables"]["users"]["Update"] = {
            notion_access_token: account.access_token || null,
            notion_bot_id: notionProfile.botId || null,
            notion_workspace_id: notionProfile.workspaceId || null,
            notion_workspace_name: notionProfile.workspaceName || null,
            notion_workspace_user_id: notionWorkspaceUserId,
            email,
            name,
            avatar_url: avatarUrl,
          };

          if (existingUser) {
            // Update existing user with Notion credentials
            const { error } = await supabaseAdmin
              .from("users")
              .update(notionData)
              .eq("id", existingUser.id);

            if (error) {
              console.error("Error updating user with Notion credentials:", error);
              return false;
            }

            return true;
          } else {
            // No existing user found by email or Notion ID
            // This is the "link account" scenario where user is already logged in with GitHub
            // We allow the sign-in to proceed, and the jwt callback will:
            // 1. Use the existing session token to identify the user
            // 2. Update that user with Notion credentials
            return true;
          }
        }

        return false;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, account, profile }) {
      // Initial sign in - GitHub
      if (account && profile && account.provider === "github") {
        const githubProfile = profile as {
          id?: number | string;
          login?: string;
        };

        token.github_id = githubProfile.id?.toString() || "";
        token.github_username = githubProfile.login || "";
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : undefined;

        // Get user ID from database
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("github_id", token.github_id)
          .single();

        if (userData) {
          token.id = userData.id;
        }
      }

      // Initial sign in - Notion
      if (account && profile && account.provider === "notion") {
        const notionProfile = profile as NotionProfile & {
          id?: string;
          botId?: string;
          workspaceId?: string;
          workspaceName?: string;
        };

        // Store Notion-specific data
        token.notionWorkspaceUserId = notionProfile.id || "";
        token.notionAccessToken = account.access_token;
        token.notionBotId = notionProfile.botId;
        token.notionWorkspaceId = notionProfile.workspaceId;

        // If user is already logged in (has existing token with id), preserve that user context
        // This handles the "link account" scenario where user signed in with GitHub first
        if (token.id && token.github_id) {
          // Update the database with Notion credentials for this user
          const notionData: Database["public"]["Tables"]["users"]["Update"] = {
            notion_access_token: account.access_token || null,
            notion_bot_id: notionProfile.botId || null,
            notion_workspace_id: notionProfile.workspaceId || null,
            notion_workspace_name: notionProfile.workspaceName || null,
            notion_workspace_user_id: notionProfile.id || null,
          };

          const { error: updateError } = await supabaseAdmin
            .from("users")
            .update(notionData)
            .eq("id", token.id as string);

          if (updateError) {
            console.error("Error updating user with Notion credentials:", updateError);
          }
        } else {
          // No existing session token - need to find the user somehow
          // The signIn callback should have already updated the database with Notion credentials
          // So we just need to find the user and populate the token
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("id, github_id, github_username, email")
            .eq("notion_workspace_user_id", notionProfile.id || "")
            .maybeSingle();

          if (userData) {
            token.id = userData.id;
            token.github_id = userData.github_id || "";
            token.github_username = userData.github_username || "";
            token.email = userData.email;
          } else {
            console.error("Could not find user after Notion OAuth");
          }
        }
      }

      // Check if GitHub token needs refresh
      if (token.accessTokenExpires && token.refreshToken) {
        const shouldRefresh =
          Date.now() > token.accessTokenExpires - 5 * 60 * 1000;

        if (shouldRefresh) {
          try {
            const refreshedTokens = await refreshGitHubAccessToken(
              token.refreshToken as string
            );

            const newTokenExpiresAt = calculateTokenExpiration(
              refreshedTokens.expires_in
            );

            // Update tokens in database
            const updateData: Database["public"]["Tables"]["users"]["Update"] =
              {
                github_access_token: refreshedTokens.access_token,
                github_refresh_token: refreshedTokens.refresh_token,
                token_expires_at: newTokenExpiresAt,
              };

            await supabaseAdmin
              .from("users")
              .update(updateData)
              .eq("github_id", token.github_id);

            return {
              ...token,
              accessToken: refreshedTokens.access_token,
              refreshToken: refreshedTokens.refresh_token,
              accessTokenExpires:
                Date.now() + refreshedTokens.expires_in * 1000,
            };
          } catch (error) {
            console.error("Error refreshing access token:", error);
            // Return old token, but force sign in on next request
            return {
              ...token,
              error: "RefreshAccessTokenError",
            };
          }
        }
      }

      // Note: Notion tokens don't have refresh tokens or expiration
      // They remain valid until manually revoked by the user

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          github_id: token.github_id as string,
          github_username: token.github_username as string,
          email: token.email as string | null,
          name: token.name as string | null,
          image: token.picture as string | null,
        };
        session.accessToken = token.accessToken as string;
        session.notionAccessToken = token.notionAccessToken as
          | string
          | undefined;
        session.notionWorkspaceUserId = token.notionWorkspaceUserId as
          | string
          | undefined;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
