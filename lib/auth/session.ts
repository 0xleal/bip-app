import { getServerSession } from 'next-auth';
import { authOptions } from './config';

/**
 * Get the current session on the server
 * Use this in Server Components and Server Actions
 */
export async function getCurrentSession() {
  return getServerSession(authOptions);
}

/**
 * Get the current user from the session
 * Throws an error if user is not authenticated
 */
export async function requireAuth() {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  return session.user;
}
