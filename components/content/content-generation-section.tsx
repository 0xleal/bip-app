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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertCircle, Wand2 } from "lucide-react";
import { QuotaDisplay } from "./quota-display";
import { ContentSuggestionCard } from "./content-suggestion-card";
import { ContentHistory } from "./content-history";
import {
  generateContentAction,
  getUserQuotaAction,
} from "@/app/actions/content";
import type { ContentSuggestion } from "@/lib/ai/types";
import type { RateLimitUsage } from "@/lib/rate-limit";
import type { DateRange } from "@/lib/github/types";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentGenerationSectionProps {
  dateRange: DateRange;
}

export function ContentGenerationSection({
  dateRange,
}: ContentGenerationSectionProps) {
  const [usage, setUsage] = useState<RateLimitUsage | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuota();
  }, []);

  const loadQuota = async () => {
    setLoadingQuota(true);
    try {
      const result = await getUserQuotaAction();
      if (result.success && result.usage) {
        setUsage(result.usage);
      }
    } catch (err) {
      console.error("Error loading quota:", err);
    } finally {
      setLoadingQuota(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const result = await generateContentAction(dateRange);

      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        if (result.usage) {
          setUsage(result.usage);
        }
      } else {
        setError(result.error || "Failed to generate content");
        if (result.usage) {
          setUsage(result.usage);
        }
      }
    } catch (err) {
      console.error("Error generating content:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canGenerate =
    usage && usage.dailyRemaining > 0 && usage.weeklyRemaining > 0;

  const dateRangeLabel =
    dateRange === "24h"
      ? "last 24 hours"
      : dateRange === "7d"
        ? "last 7 days"
        : "last 30 days";

  return (
    <div className="space-y-8">
      {/* Main Generation Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/[0.02]">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Generate Content</CardTitle>
                <CardDescription>
                  AI-powered tweet suggestions from your activity
                </CardDescription>
              </div>
            </div>
            <QuotaDisplay usage={usage} loading={loadingQuota} compact />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!canGenerate && usage && (
            <Alert>
              <AlertDescription>
                You&apos;ve reached your generation limit. Daily quota resets at{" "}
                {usage.dailyResetAt.toLocaleTimeString()}.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || loading || loadingQuota}
              size="lg"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Tweets
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Based on your {dateRangeLabel} of activity
            </p>
          </div>

          {loading && (
            <div className="space-y-4 pt-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/30 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && suggestions && suggestions.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {suggestions.length} suggestion
                  {suggestions.length !== 1 ? "s" : ""} generated
                </p>
              </div>
              <div className="grid gap-4">
                {suggestions.map((suggestion, index) => (
                  <ContentSuggestionCard
                    key={index}
                    suggestion={suggestion}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && !suggestions && !error && (
            <div className="text-center py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Ready to create shareable content
              </p>
              <p className="text-xs text-muted-foreground/70">
                Click generate to create tweets from your GitHub, Notion, and
                notes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content History */}
      <ContentHistory />
    </div>
  );
}
