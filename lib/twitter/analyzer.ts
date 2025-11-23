import Anthropic from "@anthropic-ai/sdk";
import type { TweetData, ToneOfVoiceGuide } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

/**
 * Tone of Voice Analysis Prompt
 * Based on the user's provided prompt for analyzing tweets
 */
const TONE_OF_VOICE_SYSTEM_PROMPT = `You are an expert in copywriting, brand voice, and style analysis.
Your task is to analyze tweets and define a clear "Tone of Voice Guide" that another AI model can use to write new tweets in the same style.

You will receive a set of tweets and must analyze them for consistent patterns across:
- Tone (e.g., playful, direct, analytical, encouraging, contrarian, vulnerable, sarcastic, optimistic)
- Formality (e.g., very casual, conversational, semi-formal, professional)
- Pacing & structure (e.g., short punchy lines, threads, hooks, questions, lists, "hot takes," storytelling)
- Language (e.g., simple vs. complex, jargon usage, slang, metaphors, analogies)
- Personality traits (e.g., curious, opinionated, teacher-like, coach-like, founder-like)
- Use of devices (e.g., questions to the audience, emojis, line breaks, bullets, numbered lists, caps for emphasis, repetition, rhetorical questions)

You must produce a comprehensive "Tone of Voice Guide" that another AI can follow to mimic the writing style.

IMPORTANT: Return your analysis as valid JSON matching this exact structure:
{
  "summary": "2-4 sentences describing the overall voice and vibe",
  "tone_and_personality": {
    "overall_tone": "description of the tone",
    "personality_traits": ["trait1", "trait2", "trait3"],
    "emotional_range": "description of emotional range (e.g., mostly positive, calm, provocative)"
  },
  "language_and_style": {
    "sentence_structure": "description of sentence length and structure",
    "vocabulary_level": "simple / technical / mixed",
    "slang_and_jargon": "description of slang, jargon, or buzzword usage",
    "typical_phrases": ["phrase1", "phrase2", "phrase3"]
  },
  "formatting_and_structure": {
    "typical_length": "short / medium / long",
    "line_breaks_and_spacing": "description of how line breaks and spacing are used",
    "emoji_usage": "description of emoji usage (how often, which ones, where)",
    "hooks_and_ctas": "description of how questions, hooks, and CTAs are used",
    "common_templates": ["template1", "template2", "template3"]
  },
  "dos_and_donts": {
    "dos": ["do this...", "do that..."],
    "donts": ["don't do this...", "don't do that..."]
  },
  "final_instruction": "A short instruction paragraph the AI can use directly when writing tweets"
}

Focus only on describing the tone of voice and style. Do not generate any new tweets.`;

function formatTweetsForAnalysis(tweets: TweetData[]): string {
  let prompt = "Here are the user's tweets to analyze:\n\n";

  tweets.forEach((tweet, index) => {
    prompt += `Tweet ${index + 1}:\n`;
    prompt += `${tweet.text}\n\n`;
  });

  prompt +=
    "Based on these tweets, analyze the writing style and produce a comprehensive Tone of Voice Guide in JSON format.";

  return prompt;
}

/**
 * Analyze tweets and generate a tone of voice guide
 */
export async function analyzeToneOfVoice(
  tweets: TweetData[],
): Promise<ToneOfVoiceGuide> {
  try {
    if (tweets.length === 0) {
      throw new Error("At least one tweet is required for analysis");
    }

    // Format tweets for analysis
    const userPrompt = formatTweetsForAnalysis(tweets);

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent analysis
      system: TONE_OF_VOICE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    console.log(
      `Tone analysis - Input: ${response.usage.input_tokens}, Output: ${response.usage.output_tokens} tokens`,
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
      // Try to extract object directly
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    const toneOfVoice: ToneOfVoiceGuide = JSON.parse(jsonText);

    // Add generated timestamp
    toneOfVoice.generated_at = new Date().toISOString();

    // Validate structure
    if (
      !toneOfVoice.summary ||
      !toneOfVoice.tone_and_personality ||
      !toneOfVoice.language_and_style ||
      !toneOfVoice.formatting_and_structure ||
      !toneOfVoice.dos_and_donts ||
      !toneOfVoice.final_instruction
    ) {
      throw new Error("Generated tone of voice guide is missing required fields");
    }

    return toneOfVoice;
  } catch (error) {
    console.error("Error analyzing tone of voice:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error(
          "Anthropic API rate limit exceeded. Please try again later.",
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
