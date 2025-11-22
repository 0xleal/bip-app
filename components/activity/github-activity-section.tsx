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
import { RefreshCwIcon } from "lucide-react";
import { ActivityTimeline } from "./activity-timeline";
import { getGitHubActivities, syncGitHubActivity } from "@/app/actions/github";
import type { DateRange, GitHubActivity } from "@/lib/github/types";
import { toast } from "sonner";

/**
 * Format timestamp to relative time for "Last synced" display
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="flex gap-4 p-4">
            <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </CardContent>
        </Card>
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

  // Track if we've already attempted auto-sync to prevent multiple triggers
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

        // Get the most recent synced_at timestamp
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

  // Handle manual or auto sync
  const handleSync = useCallback(async () => {
    if (isSyncing) {
      // Prevent duplicate syncs
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncGitHubActivity();

      if (result.success) {
        toast.success("Synced successfully", {
          description: `Added ${result.newItemsCount} new activities`,
        });

        // Check for rate limit warning
        if (result.rateLimitRemaining < 100) {
          toast.warning("Rate limit warning", {
            description: `Only ${result.rateLimitRemaining} requests remaining`,
          });
        }

        // Reload activities from database after successful sync
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

  // Load activities on mount and when date range changes
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Auto-sync on first load if database is empty
  useEffect(() => {
    // Only attempt auto-sync once, after initial load completes
    if (
      !loading &&
      !isSyncing &&
      !hasAttemptedAutoSync.current &&
      activities.length === 0 &&
      !error
    ) {
      hasAttemptedAutoSync.current = true;

      // Trigger auto-sync in background
      handleSync();
    }
  }, [loading, isSyncing, activities.length, error, handleSync]);

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
        GitHub Activity
      </h2>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your commits, PRs, reviews, and stars from GitHub
              </CardDescription>
            </div>

            {/* Sync Controls */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {lastSynced && !isSyncing && (
                <span className="text-sm text-muted-foreground">
                  Last synced: {formatTimeAgo(lastSynced)}
                </span>
              )}

              <Button
                onClick={handleSync}
                disabled={isSyncing}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCwIcon
                  className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing..." : "Sync"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="text-center py-8 px-4">
              <p className="text-base text-destructive mb-2">{error}</p>
              <p className="text-sm text-muted-foreground">
                Please try signing in again or contact support if the issue
                persists
              </p>
            </div>
          )}

          {!error && loading && <ActivitySkeleton />}

          {!error && !loading && <ActivityTimeline activities={activities} />}
        </CardContent>
      </Card>
    </section>
  );
}
