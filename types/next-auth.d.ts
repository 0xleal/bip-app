import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      github_id: string;
      github_username: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    github_id: string;
    github_username: string;
    email?: string | null;
    name?: string | null;
    avatar_url?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    github_id: string;
    github_username: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}
