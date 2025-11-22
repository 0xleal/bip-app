'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ContentSuggestionCard } from './content-suggestion-card';
import { getContentHistoryAction } from '@/app/actions/content';
import type { ContentSuggestion } from '@/lib/ai/types';

export function ContentHistory() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<Array<{
    id: string;
    suggestions: ContentSuggestion[];
    createdAt: string;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && !history) {
      loadHistory();
    }
  }, [isExpanded, history]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getContentHistoryAction();

      if (result.success && result.history) {
        setHistory(result.history);
      } else {
        setError(result.error || 'Failed to load history');
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Content History</CardTitle>
            <CardDescription>Your past 10 generated content suggestions</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {loading && (
            <div className="space-y-3">
              <div className="h-24 bg-muted animate-pulse rounded" />
              <div className="h-24 bg-muted animate-pulse rounded" />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive">
              {error}
              <Button
                variant="link"
                size="sm"
                onClick={loadHistory}
                className="ml-2"
              >
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && history && history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No content history yet. Generate your first content to see it here!
            </p>
          )}

          {!loading && !error && history && history.length > 0 && (
            <div className="space-y-6">
              {history.map((item) => (
                <div key={item.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Generated {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid gap-4">
                    {item.suggestions.map((suggestion, index) => (
                      <ContentSuggestionCard
                        key={index}
                        suggestion={suggestion}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
