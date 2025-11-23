/**
 * Twitter/X integration types
 */

export interface TweetData {
  text: string;
  author: string;
  url: string;
  timestamp?: string;
}

export interface ToneOfVoiceGuide {
  summary: string;
  tone_and_personality: {
    overall_tone: string;
    personality_traits: string[];
    emotional_range: string;
  };
  language_and_style: {
    sentence_structure: string;
    vocabulary_level: string;
    slang_and_jargon: string;
    typical_phrases: string[];
  };
  formatting_and_structure: {
    typical_length: string;
    line_breaks_and_spacing: string;
    emoji_usage: string;
    hooks_and_ctas: string;
    common_templates: string[];
  };
  dos_and_donts: {
    dos: string[];
    donts: string[];
  };
  final_instruction: string;
  generated_at: string;
}

export interface FetchTweetResult {
  success: boolean;
  tweet?: TweetData;
  error?: string;
}

export interface AnalyzeToneResult {
  success: boolean;
  toneOfVoice?: ToneOfVoiceGuide;
  error?: string;
}
