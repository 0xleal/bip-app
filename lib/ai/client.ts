import Anthropic from "@anthropic-ai/sdk";
import type { ContentSuggestion, GeneratedContent } from "./types";
import {
  SHOW_YOUR_WORK_SYSTEM_PROMPT,
  PROMPT_VERSION,
  formatUserInput,
  truncateInput,
} from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

export interface GenerateContentInput {
  activities: Array<{
    type: string;
    title: string;
    description?: string;
    timestamp: string;
    repo?: string;
    url?: string;
  }>;
  notes: Array<{
    content: string;
    timestamp: string;
  }>;
  dateRange: string;
}

/**
 * Generate shareable content suggestions using Anthropic API
 * @param input - Activities and notes to transform into content
 * @returns Generated content suggestions with metadata
 */
export async function generateContent(
  input: GenerateContentInput
): Promise<GeneratedContent> {
  try {
    // Apply smart truncation to manage token costs
    const { activities, notes, truncated } = truncateInput(
      input.activities,
      input.notes
    );

    if (truncated) {
      console.log(
        `Input truncated: ${input.activities.length + input.notes.length} → ${
          activities.length + notes.length
        } items`
      );
    }

    // Format input for the AI
    const userPrompt = formatUserInput(activities, notes, input.dateRange);

    // Call Anthropic API
    // Using Claude Sonnet 4.5 - the latest model recommended for best balance of intelligence, speed, and cost
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      temperature: 0.7,
      system: SHOW_YOUR_WORK_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract usage information
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    console.log(
      `API usage - Input: ${inputTokens}, Output: ${outputTokens} tokens`
    );

    // Parse the response
    const textContent = response.content[0];
    if (textContent.type !== "text") {
      throw new Error("Unexpected response type from Anthropic API");
    }

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonText = textContent.text;
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Try to extract array directly
      const arrayMatch = jsonText.match(/\[([\s\S]*)\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
    }

    const suggestions: ContentSuggestion[] = JSON.parse(jsonText);

    // Validate suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error("No valid suggestions generated");
    }

    // Ensure each suggestion has required fields
    suggestions.forEach((suggestion, index) => {
      if (
        !suggestion.hook ||
        !suggestion.body ||
        !suggestion.tone ||
        !suggestion.format
      ) {
        throw new Error(`Suggestion ${index + 1} is missing required fields`);
      }
    });

    return {
      suggestions,
      promptVersion: PROMPT_VERSION,
      inputTokens,
      outputTokens,
    };
  } catch (error) {
    console.error("Error generating content:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error(
          "Anthropic API rate limit exceeded. Please try again later."
        );
      }
      if (error.status === 401) {
        throw new Error("Invalid Anthropic API key");
      }
      throw new Error(`Anthropic API error: ${error.message}`);
    }

    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    throw error;
  }
}

/**
 * Estimate token count for input (rough approximation)
 * Used for cost estimation and monitoring
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
