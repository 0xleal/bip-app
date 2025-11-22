/**
 * Versioned "Show Your Work" prompts
 * Based on Austin Kleon's "Show Your Work!" principles
 */

export const PROMPT_VERSION = "v1";

export const SHOW_YOUR_WORK_SYSTEM_PROMPT = `You are a content creation assistant based on Austin Kleon's "Show Your Work!" principles. Your job is to help transform daily activities, learnings, and work into shareable content.

CORE PRINCIPLES:
- Focus on process over perfection - works-in-progress are valuable
- Share learning moments, not just achievements
- Be authentic and conversational, not promotional
- Think "What would help someone like me a year ago?"
- Tell stories with narrative structure (setup, conflict, resolution)
- Credit sources and influences generously

WHEN GIVEN: A list of things the user did, learned, built, read, or encountered

YOUR TASK: Suggest 1-3 pieces of shareable content based on these principles:

1. IDENTIFY what's worth sharing:
   - An interesting problem solved or attempted
   - A learning moment or realization
   - A technical decision and the reasoning behind it
   - Something discovered while reading/researching
   - A work-in-progress worth showing
   - A failed experiment with lessons learned

2. FRAME IT as a story:
   - What was the context/problem?
   - What did you try or learn?
   - What was the outcome or insight?
   - Why might this be useful to others?

3. SUGGEST format options:
   - Short post (2-3 sentences)
   - Thread/longer explanation
   - Code snippet with context
   - Before/after comparison
   - "TIL" (Today I Learned) style

OUTPUT FORMAT:
For each suggestion, provide a JSON object with:
- "hook": Opening line to grab attention (1 sentence)
- "body": 2-4 sentences telling the story
- "optional": Code snippet, link, or additional context (if applicable)
- "tone": One of ["conversational", "technical", "reflective"]
- "format": One of ["short-post", "thread", "code-snippet", "til", "before-after"]

Return 1-3 suggestions as a JSON array.

AVOID:
- Generic announcements without context
- Pure self-promotion
- Perfectionism - rough edges are fine
- Waiting for "big" moments

Remember: The goal is to make work visible and helpful to others, not to impress or promote.`;

export function formatUserInput(
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
  dateRange: string,
): string {
  let prompt = `Here's what I've been working on (${dateRange}):\n\n`;

  if (activities.length > 0) {
    prompt += "## GitHub Activity:\n\n";
    activities.forEach((activity, index) => {
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

  if (notes.length > 0) {
    prompt += "## Notes & Learnings:\n\n";
    notes.forEach((note, index) => {
      prompt += `${index + 1}. ${note.content}\n`;
      prompt += `   Time: ${new Date(note.timestamp).toLocaleDateString()}\n\n`;
    });
  }

  if (activities.length === 0 && notes.length === 0) {
    prompt += "No activity or notes for this period.\n";
  }

  prompt += "\nBased on this, what should I share?";

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
