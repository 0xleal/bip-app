import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GitCommitIcon,
  GitPullRequestIcon,
  StarIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  GitBranchIcon,
} from 'lucide-react';
import type { GitHubActivity } from '@/lib/github/types';

/**
 * Get icon component based on activity type
 */
function getActivityIcon(activityType: string) {
  const iconProps = { className: 'h-5 w-5 text-muted-foreground' };

  switch (activityType) {
    case 'commit':
      return <GitCommitIcon {...iconProps} />;
    case 'pr_created':
      return <GitPullRequestIcon {...iconProps} />;
    case 'pr_reviewed':
      return <GitBranchIcon {...iconProps} />;
    case 'star':
      return <StarIcon {...iconProps} />;
    case 'issue':
      return <MessageSquareIcon {...iconProps} />;
    default:
      return <GitCommitIcon {...iconProps} />;
  }
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

interface ActivityCardProps {
  activity: GitHubActivity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const icon = getActivityIcon(activity.activity_type);
  const timeAgo = formatTimeAgo(activity.occurred_at);

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="flex gap-4 p-4">
        <div className="flex-shrink-0 mt-1">{icon}</div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-base leading-snug mb-1 truncate">
            {activity.title}
          </h4>

          {activity.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-2 line-clamp-2">
              {activity.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {activity.repo_name && (
              <>
                <span className="font-mono truncate">{activity.repo_name}</span>
                <span>·</span>
              </>
            )}
            <time dateTime={activity.occurred_at}>{timeAgo}</time>
          </div>
        </div>

        {activity.url && (
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2"
            >
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
