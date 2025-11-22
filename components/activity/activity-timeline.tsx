import { ActivityCard } from "./activity-card";
import type { GitHubActivity } from "@/lib/github/types";

/**
 * Group activities by date
 */
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

/**
 * Format date for display (e.g., "Today", "Yesterday", "January 15, 2025")
 */
function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to compare just dates
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
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
}

interface ActivityTimelineProps {
  activities: GitHubActivity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          No activity found for this time range
        </p>
        <p className="text-sm text-muted-foreground">
          Try selecting a different date range or click Sync to fetch your
          latest activity
        </p>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);
  const sortedDates = Object.keys(groupedActivities).sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <div className="space-y-10">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            {formatDateHeader(date)}
          </h3>
          <div className="space-y-3">
            {groupedActivities[date].map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
