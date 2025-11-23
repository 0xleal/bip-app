/**
 * Versioned "Show Your Work" prompts
 * Based on Austin Kleon's "Show Your Work!" principles
 */

export const PROMPT_VERSION = "v2";

export const SHOW_YOUR_WORK_SYSTEM_PROMPT = `You are a content creation assistant specialized in creating Twitter/X posts based on Austin Kleon's "Show Your Work!" principles. Your job is to help transform daily activities, learnings, and work into shareable tweets.

CORE PRINCIPLES:
- Focus on process over perfection - works-in-progress are valuable
- Share learning moments, not just achievements
- Be authentic and conversational, not promotional
- Think "What would help someone like me a year ago?"
- Tell stories with narrative structure (setup, conflict, resolution)
- Credit sources and influences generously

WHEN GIVEN:
- A list of GitHub activities (commits, PRs, issues, etc.)
- Notion pages and content
- Manual notes and learnings
- OPTIONAL: A tone of voice guide analyzing the user's writing style

YOUR TASK: Generate 3-5 tweet options based on these principles:

1. IDENTIFY what's worth sharing:
   - An interesting problem solved or attempted
   - A learning moment or realization
   - A technical decision and the reasoning behind it
   - Something discovered while reading/researching
   - A work-in-progress worth showing
   - A failed experiment with lessons learned
   - Notion content that shows thinking/planning/learning

2. FRAME IT as a tweet-worthy story:
   - What was the context/problem?
   - What did you try or learn?
   - What was the outcome or insight?
   - Why might this be useful to others?

3. ADAPT TO USER'S TONE OF VOICE (if provided):
   - Match their typical sentence structure and vocabulary
   - Use similar emoji patterns and formatting
   - Follow their hooks and CTAs style
   - Respect their dos and don'ts

4. TWEET FORMAT OPTIONS:
   - Single tweet (280 chars max)
   - Thread starter (with clear hook for a thread)
   - Code snippet tweet (with context)
   - Before/after comparison
   - "TIL" (Today I Learned) style
   - Screenshot description (suggesting what visual to include)

OUTPUT FORMAT:
For each suggestion, provide a JSON object with:
- "hook": Opening line to grab attention (1 sentence, tweet-sized)
- "body": Main content (can be 2-4 sentences for threads, or concise for single tweets)
- "optional": Code snippet, link, or screenshot description (if applicable)
- "tone": One of ["conversational", "technical", "reflective"]
- "format": One of ["single-tweet", "thread-starter", "code-snippet", "til", "before-after", "screenshot"]
- "charCount": Estimated character count for the full tweet

Return 3-5 diverse suggestions as a JSON array, showing different angles on the same activities.

CONSTRAINTS:
- Single tweets must be under 280 characters
- Threads should have a strong hook that makes people want to read more
- Always suggest diverse perspectives (not just variations of the same tweet)
- If Notion content is included, consider it as thinking/planning work worth sharing

AVOID:
- Generic announcements without context
- Pure self-promotion
- Perfectionism - rough edges are fine
- Waiting for "big" moments
- Ignoring the user's tone of voice if provided

Remember: The goal is to make work visible and helpful to others, not to impress or promote.`;

export function formatUserInput(
  activities: Array<{
    type: string;
    title: string;
    description?: string;
    timestamp: string;
    repo?: string;
    url?: string;
    provider?: string;
    metadata?: Record<string, unknown>;
  }>,
  notes: Array<{
    content: string;
    timestamp: string;
  }>,
  dateRange: string,
  toneOfVoice?: unknown,
): string {
  let prompt = `Here's what I've been working on (${dateRange}):\n\n`;

  // Separate GitHub and Notion activities
  const githubActivities = activities.filter(
    (a) => !a.provider || a.provider === "github",
  );
  const notionActivities = activities.filter((a) => a.provider === "notion");

  if (githubActivities.length > 0) {
    prompt += "## GitHub Activity:\n\n";
    githubActivities.forEach((activity, index) => {
      prompt += `${index + 1}. **${activity.type}** - ${activity.title}\n`;
      if (activity.description) {
        prompt += `   ${activity.description}\n`;
      }
      if (activity.repo) {
        prompt += `   Repository: ${activity.repo}\n`;
      }
      prompt += `   Time: ${new Date(
        activity.timestamp,
      ).toLocaleDateString()}\n\n`;
    });
  }

  if (notionActivities.length > 0) {
    prompt += "## Notion Activity:\n\n";
    notionActivities.forEach((activity, index) => {
      prompt += `${index + 1}. **${activity.type}** - ${activity.title}\n`;
      if (activity.description) {
        prompt += `   ${activity.description}\n`;
      }
      // Include page content if available in metadata
      if (activity.metadata?.content) {
        const content =
          typeof activity.metadata.content === "string"
            ? activity.metadata.content
            : JSON.stringify(activity.metadata.content);
        const truncatedContent =
          content.length > 200 ? content.substring(0, 200) + "..." : content;
        prompt += `   Content preview: ${truncatedContent}\n`;
      }
      if (activity.url) {
        prompt += `   URL: ${activity.url}\n`;
      }
      prompt += `   Time: ${new Date(
        activity.timestamp,
      ).toLocaleDateString()}\n\n`;
    });
  }

  if (notes.length > 0) {
    prompt += "## Manual Notes & Learnings:\n\n";
    notes.forEach((note, index) => {
      prompt += `${index + 1}. ${note.content}\n`;
      prompt += `   Time: ${new Date(note.timestamp).toLocaleDateString()}\n\n`;
    });
  }

  if (
    githubActivities.length === 0 &&
    notionActivities.length === 0 &&
    notes.length === 0
  ) {
    prompt += "No activity or notes for this period.\n";
  }

  // Include tone of voice guide if provided
  if (toneOfVoice) {
    prompt += "\n## Your Writing Style:\n\n";
    prompt += "Please follow this tone of voice guide when creating tweets:\n\n";
    prompt += "```json\n";
    prompt += JSON.stringify(toneOfVoice, null, 2);
    prompt += "\n```\n\n";
    prompt +=
      "Match this style closely - use similar sentence structures, vocabulary, emoji usage, and respect the dos and don'ts.\n";
  }

  prompt +=
    "\nBased on this activity and my writing style, suggest 3-5 diverse tweet options I could share.";

  return prompt;
}

/**
 * Truncate input to manage token costs
 * Target: ~2000 input tokens max
 */
export function truncateInput(
  activities: Array<{
    type: string;
    title: string;
    description?: string;
    timestamp: string;
    repo?: string;
    url?: string;
  }>,
  notes: Array<{
    content: string;
    timestamp: string;
  }>,
  maxItems = 50,
): {
  activities: typeof activities;
  notes: typeof notes;
  truncated: boolean;
} {
  const totalItems = activities.length + notes.length;

  if (totalItems <= maxItems) {
    return { activities, notes, truncated: false };
  }

  // Truncate activities and notes proportionally
  const activityRatio = activities.length / totalItems;
  const maxActivities = Math.floor(maxItems * activityRatio);
  const maxNotes = maxItems - maxActivities;

  const truncatedActivities = activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, maxActivities);

  const truncatedNotes = notes
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, maxNotes);

  return {
    activities: truncatedActivities,
    notes: truncatedNotes,
    truncated: true,
  };
}
