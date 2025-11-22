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
 * Notion OAuth profile response type
 */
interface NotionProfile {
  bot: {
    id: string;
    owner: {
      user: {
        id: string;
        name: string;
        avatar_url: string;
        person?: {
          email: string;
        };
      };
    };
  };
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
    token: "https://api.notion.com/v1/oauth/token",
    userinfo: "https://api.notion.com/v1/users/me",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile) {
      // Return a user-like object with Notion-specific fields
      // The `as unknown` cast is necessary because NextAuth's User type
      // expects github_id/github_username which Notion doesn't have
      return {
        id: profile.bot.owner.user.id,
        name: profile.bot.owner.user.name,
        email: profile.bot.owner.user.person?.email || null,
        image: profile.bot.owner.user.avatar_url,
        botId: profile.bot.id,
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
    async signIn({ user, account, profile }) {
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

          // For Notion, we need to find existing user by email or create new one
          // Since Notion doesn't have a unique user ID like GitHub's github_id
          let existingUser = null;

          if (email) {
            const { data } = await supabaseAdmin
              .from("users")
              .select("id")
              .eq("email", email)
              .maybeSingle();
            existingUser = data;
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
              console.error(
                "Error updating user with Notion credentials:",
                error
              );
              return false;
            }
          } else {
            // Create new user (this case is unlikely in our flow since user should sign in with GitHub first)
            console.warn(
              "Notion sign-in without existing user - this should not happen in normal flow"
            );
            return false;
          }

          return true;
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
        };

        token.notionWorkspaceUserId = notionProfile.id || "";
        token.notionAccessToken = account.access_token;
        token.notionBotId = notionProfile.botId;
        token.notionWorkspaceId = notionProfile.workspaceId;

        // Get user ID from database by email (since Notion doesn't provide stable user ID)
        if (token.email) {
          const { data: userData } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", token.email as string)
            .single();

          if (userData) {
            token.id = userData.id;
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
