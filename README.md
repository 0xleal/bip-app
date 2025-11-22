# BIP App - Build In Public

A Next.js application that helps developers share their coding journey by automatically tracking GitHub activity, capturing manual notes, and generating social media content with AI.

## What This Does

BIP App (Build In Public) is a dashboard that:

1. **Tracks Your GitHub Activity** - Automatically syncs and displays your commits, pull requests, reviews, and starred repositories
2. **Captures Manual Notes** - Allows you to document learnings and discoveries as you work
3. **Generates Content with AI** - Uses Claude AI to create shareable social media posts based on your activity and notes

Perfect for developers who want to build in public but struggle with consistent documentation and content creation.

## Features

- **GitHub Integration**: OAuth authentication and automatic activity syncing
- **Date Range Filtering**: View activity from the last 24 hours, 7 days, or 30 days
- **Manual Notes**: Add, edit, and delete notes about your learnings
- **AI Content Generation**: Claude-powered content suggestions for Twitter, LinkedIn, etc.
- **Rate Limiting**: Built-in quotas to manage API costs (daily and weekly limits)
- **Dark Mode**: Theme support with system preference detection
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before you begin, you'll need:

- Node.js 20 or higher
- A GitHub account (for OAuth)
- A Supabase account (for database)
- An Anthropic API key (for AI features)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd bip-app
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here # Generate with: openssl rand -base64 32

# GitHub OAuth (https://github.com/settings/developers)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Supabase (https://supabase.com/dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Anthropic API (https://console.anthropic.com/)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 3. Set Up GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: BIP App (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and generate a Client Secret
5. Add these to your `.env.local` file

**Required GitHub Scopes**: `read:user`, `user:email`, `repo`

### 4. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from Settings > API
3. Create the required tables (see Database Schema section below)
4. Add the credentials to your `.env.local` file

### 5. Get an Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key
3. Add it to your `.env.local` file

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

You'll need to create these tables in Supabase:

### `github_activities` table
```sql
CREATE TABLE github_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  repo_name TEXT,
  repo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_github_activities_user_id ON github_activities(user_id);
CREATE INDEX idx_github_activities_created_at ON github_activities(created_at);
```

### `manual_notes` table
```sql
CREATE TABLE manual_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_notes_user_id ON manual_notes(user_id);
CREATE INDEX idx_manual_notes_created_at ON manual_notes(created_at);
```

### `content_generations` table
```sql
CREATE TABLE content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date_range TEXT NOT NULL,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_generations_user_id ON content_generations(user_id);
CREATE INDEX idx_content_generations_created_at ON content_generations(created_at);
```

### `rate_limits` table
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  daily_count INTEGER DEFAULT 0,
  weekly_count INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL,
  weekly_reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_user_id ON rate_limits(user_id);
```

## Usage

1. **Sign in with GitHub** - Click the login button and authorize the app
2. **Sync Your Activity** - The app will automatically sync your GitHub activity on first load
3. **Add Manual Notes** - Use the notes section to document what you're learning
4. **Generate Content** - Click "Generate Content" to create AI-powered social media posts
5. **Copy and Share** - Copy the generated content and share it on your preferred platforms

## Rate Limits

To manage API costs, the app includes built-in rate limits:

- **Daily limit**: 3 generations per day
- **Weekly limit**: 10 generations per week

Limits reset automatically at midnight UTC.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Authentication**: NextAuth.js with GitHub OAuth
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Type Safety**: TypeScript + Zod

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript type checking
```

## Project Structure

```
bip-app/
├── app/
│   ├── actions/       # Server actions for data fetching
│   ├── api/          # API routes (NextAuth)
│   ├── login/        # Login page
│   └── page.tsx      # Main dashboard
├── components/
│   ├── activity/     # GitHub activity components
│   ├── content/      # AI content generation components
│   ├── notes/        # Manual notes components
│   ├── shared/       # Shared components
│   └── ui/           # Base UI components
├── lib/
│   ├── ai/           # AI integration utilities
│   ├── github/       # GitHub API utilities
│   ├── notes/        # Notes utilities
│   └── rate-limit/   # Rate limiting logic
└── types/            # TypeScript type definitions
```

## Contributing

This is a personal project built for ETHGlobal Buenos Aires 2025. Feel free to fork and adapt it for your own use.

## License

MIT

## Support

If you encounter issues:
1. Ensure all environment variables are correctly set
2. Verify your Supabase tables are created with the correct schema
3. Check that your GitHub OAuth app has the required scopes
4. Confirm your Anthropic API key has sufficient credits
