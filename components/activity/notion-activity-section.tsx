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
import {
  getNotionActivities,
  syncNotionActivity,
} from "@/app/actions/notion";
import type { DateRange } from "@/lib/github/types";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import type { Json } from "@/types/supabase";

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

interface NotionActivitySectionProps {
  dateRange: DateRange;
}

type NotionActivity = {
  activity_type: string;
  created_at: string | null;
  description: string | null;
  id: string;
  metadata: Json;
  occurred_at: string;
  provider: string;
  repo_name: string | null;
  synced_at: string | null;
  title: string;
  url: string | null;
  user_id: string | null;
};

export function NotionActivitySection({
  dateRange,
}: NotionActivitySectionProps) {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<NotionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already attempted auto-sync to prevent multiple triggers
  const hasAttemptedAutoSync = useRef(false);

  const hasNotionConnection = !!session?.notionAccessToken;

  const loadActivities = useCallback(async () => {
    if (!hasNotionConnection) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getNotionActivities({ dateRange });

      if (result.error) {
        setError(result.error);
        setActivities([]);
      } else if (result.activities) {
        // Map activities to include repo_name field (null for Notion activities)
        setActivities(result.activities.map(a => ({ ...a, repo_name: null })));

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
      console.error("Error loading Notion activities:", err);
      setError("Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, hasNotionConnection]);

  // Handle manual or auto sync
  const handleSync = useCallback(async () => {
    if (isSyncing || !hasNotionConnection) {
      return;
    }

    setIsSyncing(true);

    try {
      const result = await syncNotionActivity();

      if (result.success) {
        toast.success("Synced successfully", {
          description: `Added ${result.newItemsCount} new activities`,
        });

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
  }, [isSyncing, hasNotionConnection, loadActivities]);

  // Load activities on mount and when date range changes
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Auto-sync on first load if database is empty
  useEffect(() => {
    if (
      !loading &&
      !isSyncing &&
      !hasAttemptedAutoSync.current &&
      activities.length === 0 &&
      !error &&
      hasNotionConnection
    ) {
      hasAttemptedAutoSync.current = true;
      handleSync();
    }
  }, [
    loading,
    isSyncing,
    activities.length,
    error,
    hasNotionConnection,
    handleSync,
  ]);

  // Not connected state
  if (!hasNotionConnection) {
    return (
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
          Notion Activity
        </h2>

        <Card>
          <CardHeader>
            <CardTitle>Connect Notion</CardTitle>
            <CardDescription>
              Track your Notion pages, databases, and edits alongside your
              GitHub activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 px-4">
              <p className="text-base text-muted-foreground mb-6">
                Connect your Notion workspace to see your recent page and
                database edits
              </p>
              <Button
                onClick={() => signIn("notion", { callbackUrl: "/" })}
                size="lg"
                className="gap-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.887-.748-.84l-15.177.887c-.56.047-.747.327-.747.887zm14.337.746c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
                </svg>
                Connect Notion
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
        Notion Activity
      </h2>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your page edits, database updates, and documents from Notion
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
                Please try reconnecting Notion or contact support if the issue
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
