"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, Github } from "lucide-react";
import { ActivityTimeline } from "./activity-timeline";
import { getGitHubActivities, syncGitHubActivity } from "@/app/actions/github";
import type { DateRange, GitHubActivity } from "@/lib/github/types";
import { toast } from "sonner";

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return "Just now";
  }
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/30">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface GitHubActivitySectionProps {
  dateRange: DateRange;
}

export function GitHubActivitySection({
  dateRange,
}: GitHubActivitySectionProps) {
  const [activities, setActivities] = useState<GitHubActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasAttemptedAutoSync = useRef(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getGitHubActivities({ dateRange });

      if (result.error) {
        setError(result.error);
        setActivities([]);
      } else if (result.activities) {
        setActivities(result.activities);

        if (result.activities.length > 0) {
          const mostRecentSync = result.activities
            .filter((a) => a.synced_at)
            .sort((a, b) => {
              const dateA = a.synced_at ? new Date(a.synced_at).getTime() : 0;
              const dateB = b.synced_at ? new Date(b.synced_at).getTime() : 0;
              return dateB - dateA;
            })[0];

          if (mostRecentSync?.synced_at) {
            setLastSynced(mostRecentSync.synced_at);
          }
        }
      }
    } catch (err) {
      console.error("Error loading activities:", err);
      setError("Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);

    try {
      const result = await syncGitHubActivity();

      if (result.success) {
        toast.success("Synced successfully", {
          description: `Added ${result.newItemsCount} new activities`,
        });

        if (result.rateLimitRemaining < 100) {
          toast.warning("Rate limit warning", {
            description: `Only ${result.rateLimitRemaining} requests remaining`,
          });
        }

        await loadActivities();
      } else {
        toast.error("Sync failed", {
          description: result.error || "Failed to sync activities",
        });
      }
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Sync failed", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadActivities]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (
      !loading &&
      !isSyncing &&
      !hasAttemptedAutoSync.current &&
      activities.length === 0 &&
      !error
    ) {
      hasAttemptedAutoSync.current = true;
      handleSync();
    }
  }, [loading, isSyncing, activities.length, error, handleSync]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
              <Github className="h-5 w-5 text-foreground/70" />
            </div>
            <div>
              <CardTitle>GitHub</CardTitle>
              <CardDescription>
                Commits, PRs, reviews & stars
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {lastSynced && !isSyncing && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {formatTimeAgo(lastSynced)}
              </span>
            )}

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <RefreshCwIcon
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">
              Try signing in again or contact support
            </p>
          </div>
        )}

        {!error && loading && <ActivitySkeleton />}

        {!error && !loading && <ActivityTimeline activities={activities} />}
      </CardContent>
    </Card>
  );
}
