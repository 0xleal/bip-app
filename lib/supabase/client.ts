import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Client-side Supabase client (uses anon key, RLS enforced)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client with service role (bypasses RLS)
 * Use sparingly and only for admin operations
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
);

/**
 * Create a Supabase client with RLS context set for a specific user
 * This ensures all queries are scoped to the user's data
 *
 * @param githubId - The GitHub ID of the authenticated user
 * @returns Supabase client with RLS context set
 */
export function createSupabaseClientWithRLS(githubId: string) {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "X-User-GitHub-ID": githubId,
      },
    },
  });

  return client;
}

/**
 * Helper to set RLS context for a query
 * This is used in Server Actions to ensure queries are scoped to the authenticated user
 *
 * Note: RLS context is set via database-level policies that check the user's github_id
 * from the session. The application ensures queries are filtered by user_id which
 * corresponds to the authenticated user.
 *
 * @param _githubId - The GitHub ID of the authenticated user (unused for now)
 * @returns Supabase client for the authenticated user
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getSupabaseForUser(_githubId: string) {
  // For now, return the regular client
  // RLS policies will be enforced at the database level
  // In a production setup, you would set the user context via custom headers
  return supabase;
}
