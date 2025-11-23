"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SparklesIcon, TrashIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import {
  generateToneOfVoice,
  getToneOfVoice,
  deleteToneOfVoice,
} from "@/app/actions/twitter";
import type { ToneOfVoiceGuide } from "@/lib/twitter/types";

export function ToneOfVoiceSection() {
  const [tweetUrls, setTweetUrls] = useState<string[]>(["", "", ""]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toneOfVoice, setToneOfVoice] = useState<ToneOfVoiceGuide | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...tweetUrls];
    newUrls[index] = value;
    setTweetUrls(newUrls);
  };

  const handleAddMore = () => {
    if (tweetUrls.length < 10) {
      setTweetUrls([...tweetUrls, ""]);
    }
  };

  const handleRemove = (index: number) => {
    if (tweetUrls.length > 1) {
      const newUrls = tweetUrls.filter((_, i) => i !== index);
      setTweetUrls(newUrls);
    }
  };

  const handleGenerate = async () => {
    // Filter out empty URLs
    const validUrls = tweetUrls.filter((url) => url.trim() !== "");

    if (validUrls.length === 0) {
      toast.error("Please provide at least one tweet URL");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateToneOfVoice(validUrls);

      if (result.success && result.toneOfVoice) {
        setToneOfVoice(result.toneOfVoice);
        setShowGuide(true);
        toast.success("Tone of voice generated successfully!");
      } else {
        toast.error(result.error || "Failed to generate tone of voice");
      }
    } catch (error) {
      console.error("Error generating tone of voice:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadExisting = async () => {
    setIsLoading(true);

    try {
      const result = await getToneOfVoice();

      if (result.success && result.toneOfVoice) {
        setToneOfVoice(result.toneOfVoice);
        setShowGuide(true);
        toast.success("Loaded existing tone of voice");
      } else {
        toast.error(result.error || "No existing tone of voice found");
      }
    } catch (error) {
      console.error("Error loading tone of voice:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your tone of voice guide?")) {
      return;
    }

    try {
      const result = await deleteToneOfVoice();

      if (result.success) {
        setToneOfVoice(null);
        setShowGuide(false);
        toast.success("Tone of voice deleted");
      } else {
        toast.error(result.error || "Failed to delete tone of voice");
      }
    } catch (error) {
      console.error("Error deleting tone of voice:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                Twitter Tone of Voice
              </CardTitle>
              <CardDescription className="mt-2">
                Analyze your tweets to generate a personalized tone of voice guide
                for content creation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Tweet URLs</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadExisting}
                disabled={isLoading || isGenerating}
              >
                {isLoading ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load Existing"
                )}
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                Provide 1-10 of your tweets to analyze your writing style. Example
                URL: https://x.com/username/status/1234567890
              </AlertDescription>
            </Alert>

            {tweetUrls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Tweet URL ${index + 1}`}
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  disabled={isGenerating}
                />
                {tweetUrls.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemove(index)}
                    disabled={isGenerating}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              {tweetUrls.length < 10 && (
                <Button
                  variant="outline"
                  onClick={handleAddMore}
                  disabled={isGenerating}
                >
                  Add More
                </Button>
              )}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="ml-auto"
              >
                {isGenerating ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Generate Tone of Voice
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Section */}
          {showGuide && toneOfVoice && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Tone of Voice Guide</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <div className="space-y-4 text-sm">
                  {/* Summary */}
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-muted-foreground">{toneOfVoice.summary}</p>
                  </div>

                  {/* Tone & Personality */}
                  <div>
                    <h4 className="font-semibold mb-2">Tone & Personality</h4>
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        <span className="font-medium">Overall tone:</span>{" "}
                        {toneOfVoice.tone_and_personality.overall_tone}
                      </p>
                      <p>
                        <span className="font-medium">Personality traits:</span>{" "}
                        {toneOfVoice.tone_and_personality.personality_traits.join(
                          ", ",
                        )}
                      </p>
                      <p>
                        <span className="font-medium">Emotional range:</span>{" "}
                        {toneOfVoice.tone_and_personality.emotional_range}
                      </p>
                    </div>
                  </div>

                  {/* Language & Style */}
                  <div>
                    <h4 className="font-semibold mb-2">Language & Writing Style</h4>
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        <span className="font-medium">Sentence structure:</span>{" "}
                        {toneOfVoice.language_and_style.sentence_structure}
                      </p>
                      <p>
                        <span className="font-medium">Vocabulary level:</span>{" "}
                        {toneOfVoice.language_and_style.vocabulary_level}
                      </p>
                      <p>
                        <span className="font-medium">Slang & jargon:</span>{" "}
                        {toneOfVoice.language_and_style.slang_and_jargon}
                      </p>
                      {toneOfVoice.language_and_style.typical_phrases.length > 0 && (
                        <div>
                          <span className="font-medium">Typical phrases:</span>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {toneOfVoice.language_and_style.typical_phrases.map(
                              (phrase, i) => (
                                <li key={i}>{phrase}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formatting & Structure */}
                  <div>
                    <h4 className="font-semibold mb-2">
                      Formatting & Structure on X
                    </h4>
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        <span className="font-medium">Typical length:</span>{" "}
                        {toneOfVoice.formatting_and_structure.typical_length}
                      </p>
                      <p>
                        <span className="font-medium">Line breaks & spacing:</span>{" "}
                        {
                          toneOfVoice.formatting_and_structure
                            .line_breaks_and_spacing
                        }
                      </p>
                      <p>
                        <span className="font-medium">Emoji usage:</span>{" "}
                        {toneOfVoice.formatting_and_structure.emoji_usage}
                      </p>
                      <p>
                        <span className="font-medium">Hooks & CTAs:</span>{" "}
                        {toneOfVoice.formatting_and_structure.hooks_and_ctas}
                      </p>
                      {toneOfVoice.formatting_and_structure.common_templates
                        .length > 0 && (
                        <div>
                          <span className="font-medium">Common templates:</span>
                          <ul className="list-disc list-inside ml-4 mt-1">
                            {toneOfVoice.formatting_and_structure.common_templates.map(
                              (template, i) => (
                                <li key={i}>{template}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Do's and Don'ts */}
                  <div>
                    <h4 className="font-semibold mb-2">Do's and Don'ts</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium mb-1 text-green-600 dark:text-green-400">
                          Do:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          {toneOfVoice.dos_and_donts.dos.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-1 text-red-600 dark:text-red-400">
                          Don't:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          {toneOfVoice.dos_and_donts.donts.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Final Instruction */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">
                      AI Instruction for Tweet Writing
                    </h4>
                    <p className="text-muted-foreground italic">
                      {toneOfVoice.final_instruction}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground">
                    Generated on{" "}
                    {new Date(toneOfVoice.generated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
