"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SparklesIcon,
  TrashIcon,
  LoaderCircleIcon,
  PlusIcon,
  Mic2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [toneOfVoice, setToneOfVoice] = useState<ToneOfVoiceGuide | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadExistingToneOfVoice();
  }, []);

  const loadExistingToneOfVoice = async () => {
    setIsLoading(true);

    try {
      const result = await getToneOfVoice();

      if (result.success && result.toneOfVoice) {
        setToneOfVoice(result.toneOfVoice);
        setShowGuide(true);
      }
    } catch (error) {
      console.error("Error loading tone of voice:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
        toast.success("Tone of voice generated!");
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

  const handleDelete = async () => {
    if (!confirm("Delete your tone of voice guide?")) return;

    try {
      const result = await deleteToneOfVoice();

      if (result.success) {
        setToneOfVoice(null);
        setShowGuide(false);
        toast.success("Tone of voice deleted");
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting tone of voice:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mic2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Tone of Voice</CardTitle>
              <CardDescription>
                Analyze your tweets to personalize content generation
              </CardDescription>
            </div>
          </div>
          {toneOfVoice && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoading && !toneOfVoice && (
          <div className="flex items-center justify-center py-8">
            <LoaderCircleIcon className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading...
            </span>
          </div>
        )}

        {/* Input Section */}
        {!isLoading && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-xs">
                Provide 1-10 tweet URLs to analyze your writing style
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              {tweetUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`https://x.com/username/status/...`}
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    disabled={isGenerating}
                    className="text-sm"
                  />
                  {tweetUrls.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(index)}
                      disabled={isGenerating}
                      className="h-11 w-11 flex-shrink-0"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {tweetUrls.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddMore}
                  disabled={isGenerating}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add URL
                </Button>
              )}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="sm"
                className="ml-auto"
              >
                {isGenerating ? (
                  <>
                    <LoaderCircleIcon className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {toneOfVoice ? "Update" : "Generate"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {showGuide && toneOfVoice && (
          <div className="space-y-6 pt-4 border-t border-border/50">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground leading-relaxed">
                {toneOfVoice.summary}
              </p>
            </div>

            {/* Tone & Personality */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Tone & Personality
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Overall:
                  </span>
                  <span className="text-foreground">
                    {toneOfVoice.tone_and_personality.overall_tone}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Traits:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {toneOfVoice.tone_and_personality.personality_traits.map(
                      (trait, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
                        >
                          {trait}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Range:
                  </span>
                  <span className="text-foreground">
                    {toneOfVoice.tone_and_personality.emotional_range}
                  </span>
                </div>
              </div>
            </div>

            {/* Language & Style */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Language & Style
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Structure:
                  </span>
                  <span className="text-foreground">
                    {toneOfVoice.language_and_style.sentence_structure}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Vocabulary:
                  </span>
                  <span className="text-foreground">
                    {toneOfVoice.language_and_style.vocabulary_level}
                  </span>
                </div>
                {toneOfVoice.language_and_style.typical_phrases.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-28 flex-shrink-0">
                      Phrases:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {toneOfVoice.language_and_style.typical_phrases
                        .slice(0, 5)
                        .map((phrase, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground italic"
                          >
                            &quot;{phrase}&quot;
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Formatting */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                Formatting
              </h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Length:
                  </span>
                  <span className="text-foreground">
                    {toneOfVoice.formatting_and_structure.typical_length}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-28 flex-shrink-0">
                    Emojis:
                  </span>
                  <span className="text-foreground">
                    {toneOfVoice.formatting_and_structure.emoji_usage}
                  </span>
                </div>
              </div>
            </div>

            {/* Do's and Don'ts */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Do
                </h4>
                <ul className="space-y-1.5">
                  {toneOfVoice.dos_and_donts.dos.slice(0, 4).map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-green-500"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  Don&apos;t
                </h4>
                <ul className="space-y-1.5">
                  {toneOfVoice.dos_and_donts.donts
                    .slice(0, 4)
                    .map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-muted-foreground leading-relaxed pl-4 relative before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-red-500"
                      >
                        {item}
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground/60 pt-2">
              Generated {new Date(toneOfVoice.generated_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
