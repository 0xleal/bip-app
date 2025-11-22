import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  refreshGitHubAccessToken,
  calculateTokenExpiration,
} from "./token-refresh";
import type { Database } from "@/types/supabase";

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
          console.error("Error upserting user to Supabase:", error);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
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

      // Check if token needs refresh
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
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
