'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertCircle } from 'lucide-react';
import { QuotaDisplay } from './quota-display';
import { ContentSuggestionCard } from './content-suggestion-card';
import { ContentHistory } from './content-history';
import { generateContentAction, getUserQuotaAction } from '@/app/actions/content';
import type { ContentSuggestion } from '@/lib/ai/types';
import type { RateLimitUsage } from '@/lib/rate-limit';
import type { DateRange } from '@/lib/github/types';
import { Skeleton } from '@/components/ui/skeleton';

interface ContentGenerationSectionProps {
  dateRange: DateRange;
}

export function ContentGenerationSection({ dateRange }: ContentGenerationSectionProps) {
  const [usage, setUsage] = useState<RateLimitUsage | null>(null);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load quota on mount
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
      console.error('Error loading quota:', err);
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
        setError(result.error || 'Failed to generate content');
        if (result.usage) {
          setUsage(result.usage);
        }
      }
    } catch (err) {
      console.error('Error generating content:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = usage && usage.dailyRemaining > 0 && usage.weeklyRemaining > 0;

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground leading-tight">
        Generated Content
      </h2>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main content generation area */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Share Your Work
              </CardTitle>
              <CardDescription>
                AI-generated content suggestions based on your activity and notes
              </CardDescription>
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
                    You&apos;ve reached your generation limit. Daily quota resets at{' '}
                    {usage.dailyResetAt.toLocaleTimeString()}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || loading || loadingQuota}
                  className="flex-1 sm:flex-none"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground self-center">
                  Based on your {dateRange === '24h' ? 'last 24 hours' : dateRange === '7d' ? 'last 7 days' : 'last 30 days'}
                </p>
              </div>

              {loading && (
                <div className="space-y-4 pt-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              )}

              {!loading && suggestions && suggestions.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">
                      Generated {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
                    </h3>
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
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-base leading-relaxed">
                    Click &quot;Generate Content&quot; to create shareable posts from your work
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content History */}
          <ContentHistory />
        </div>

        {/* Sidebar with quota */}
        <div>
          <Card className="border-border/50 sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Your Quota</CardTitle>
              <CardDescription>
                Generation limits to manage costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuotaDisplay usage={usage} loading={loadingQuota} />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
