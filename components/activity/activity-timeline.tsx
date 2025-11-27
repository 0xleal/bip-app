"use client";

import { useState } from "react";
import { CalendarDays, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GitHubActivity } from "@/lib/github/types";
import { CompactActivityItem } from "./activity-card";

type RepoGroup = {
  repoName: string;
  activities: GitHubActivity[];
  summary: {
    commits: number;
    prs: number;
    reviews: number;
    stars: number;
    issues: number;
  };
  mostRecentAt: string;
  repoUrl: string | null;
};

function groupActivitiesByRepo(activities: GitHubActivity[]): RepoGroup[] {
  const grouped: Record<string, GitHubActivity[]> = {};

  for (const activity of activities) {
    // For GitHub: use repo_name
    // For Notion: use title (page/database name) since there's no repo_name
    const groupKey = activity.repo_name || activity.title || "Unknown";
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(activity);
  }

  const repoGroups: RepoGroup[] = Object.entries(grouped).map(
    ([repoName, repoActivities]) => {
      // Sort activities within repo by date (newest first)
      const sorted = [...repoActivities].sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );

      // Calculate summary counts
      const summary = {
        commits: 0,
        prs: 0,
        reviews: 0,
        stars: 0,
        issues: 0,
      };

      for (const activity of sorted) {
        switch (activity.activity_type) {
          case "commit":
            summary.commits++;
            break;
          case "pr_created":
            summary.prs++;
            break;
          case "pr_reviewed":
            summary.reviews++;
            break;
          case "star":
            summary.stars++;
            break;
          case "issue":
            summary.issues++;
            break;
        }
      }

      // Get repo URL from first activity that has a URL
      const repoUrl = sorted[0]?.url
        ? sorted[0].url.split("/").slice(0, 5).join("/")
        : null;

      return {
        repoName,
        activities: sorted,
        summary,
        mostRecentAt: sorted[0]?.occurred_at || "",
        repoUrl,
      };
    },
  );

  // Sort repo groups by most recent activity
  return repoGroups.sort(
    (a, b) =>
      new Date(b.mostRecentAt).getTime() - new Date(a.mostRecentAt).getTime(),
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "Now";
}

function formatSummary(summary: RepoGroup["summary"]): string {
  const parts: string[] = [];

  if (summary.commits > 0) {
    parts.push(`${summary.commits} commit${summary.commits !== 1 ? "s" : ""}`);
  }
  if (summary.prs > 0) {
    parts.push(`${summary.prs} PR${summary.prs !== 1 ? "s" : ""}`);
  }
  if (summary.reviews > 0) {
    parts.push(`${summary.reviews} review${summary.reviews !== 1 ? "s" : ""}`);
  }
  if (summary.stars > 0) {
    parts.push(`${summary.stars} star${summary.stars !== 1 ? "s" : ""}`);
  }
  if (summary.issues > 0) {
    parts.push(`${summary.issues} issue${summary.issues !== 1 ? "s" : ""}`);
  }

  return parts.join(" · ");
}

function RepoActivityGroup({ group }: { group: RepoGroup }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const summaryText = formatSummary(group.summary);
  const timeAgo = formatTimeAgo(group.mostRecentAt);

  // Extract just the repo name (without owner) for display
  const displayName = group.repoName.includes("/")
    ? group.repoName
    : group.repoName;

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-200">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {displayName}
            </span>
            {group.repoUrl && (
              <a
                href={group.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{summaryText}</p>
        </div>

        <span className="text-xs text-muted-foreground flex-shrink-0">
          {timeAgo}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border/40 bg-muted/10">
          <div className="p-2 space-y-0.5">
            {group.activities.map((activity) => (
              <CompactActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ActivityTimelineProps {
  activities: GitHubActivity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
          <CalendarDays className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No activity found</p>
        <p className="text-xs text-muted-foreground/70">
          Try a different date range or sync to fetch latest
        </p>
      </div>
    );
  }

  const repoGroups = groupActivitiesByRepo(activities);

  return (
    <div className="space-y-2">
      {repoGroups.map((group) => (
        <RepoActivityGroup key={group.repoName} group={group} />
      ))}
    </div>
  );
}
