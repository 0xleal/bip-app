import { ActivityCard } from "./activity-card";
import { CalendarDays } from "lucide-react";
import type { GitHubActivity } from "@/lib/github/types";

function groupActivitiesByDate(
  activities: GitHubActivity[],
): Record<string, GitHubActivity[]> {
  const grouped: Record<string, GitHubActivity[]> = {};

  for (const activity of activities) {
    const date = new Date(activity.occurred_at).toISOString().split("T")[0];

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(activity);
  }

  return grouped;
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
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
        <p className="text-sm text-muted-foreground mb-1">
          No activity found
        </p>
        <p className="text-xs text-muted-foreground/70">
          Try a different date range or sync to fetch latest
        </p>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);
  const sortedDates = Object.keys(groupedActivities).sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            {formatDateHeader(date)}
          </h3>
          <div className="space-y-0.5">
            {groupedActivities[date].map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
