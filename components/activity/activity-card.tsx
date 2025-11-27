import { Button } from "@/components/ui/button";
import {
  GitCommitIcon,
  GitPullRequestIcon,
  StarIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  FileTextIcon,
  DatabaseIcon,
  FolderIcon,
  CircleIcon,
} from "lucide-react";
import type { GitHubActivity } from "@/lib/github/types";
import type { NotionActivityMetadata } from "@/lib/notion/types";

function getCommitsFromMetadata(
  metadata: unknown,
): Array<{ sha: string; message: string }> {
  if (!metadata || typeof metadata !== "object") return [];

  const metadataObj = metadata as Record<string, unknown>;
  const commits = metadataObj.commits;

  if (!Array.isArray(commits)) return [];

  return commits
    .filter(
      (c): c is { sha: string; message: string } =>
        typeof c === "object" && c !== null && "sha" in c && "message" in c,
    )
    .map((c) => ({
      sha: c.sha,
      message: c.message,
    }));
}

function getActivityIcon(activityType: string, metadata?: unknown) {
  const baseClass = "h-4 w-4";

  if (
    activityType.startsWith("page_") ||
    activityType.startsWith("database_")
  ) {
    const notionMetadata = metadata as NotionActivityMetadata | undefined;

    if (activityType.startsWith("database_")) {
      return <DatabaseIcon className={`${baseClass} text-violet-500`} />;
    } else if (notionMetadata?.parent_type === "workspace") {
      return <FileTextIcon className={`${baseClass} text-blue-500`} />;
    } else {
      return <FileTextIcon className={`${baseClass} text-muted-foreground`} />;
    }
  }

  switch (activityType) {
    case "commit":
      return <GitCommitIcon className={`${baseClass} text-muted-foreground`} />;
    case "pr_created":
      return <GitPullRequestIcon className={`${baseClass} text-green-500`} />;
    case "pr_reviewed":
      return <GitBranchIcon className={`${baseClass} text-blue-500`} />;
    case "star":
      return <StarIcon className={`${baseClass} text-amber-500`} />;
    case "issue":
      return <MessageSquareIcon className={`${baseClass} text-muted-foreground`} />;
    default:
      return <GitCommitIcon className={`${baseClass} text-muted-foreground`} />;
  }
}

function getNotionLocationBadge(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  const notionMetadata = metadata as NotionActivityMetadata;

  if (notionMetadata.parent_type === "workspace") {
    return "Workspace";
  } else if (notionMetadata.parent_type === "page_id") {
    return "Nested";
  } else if (notionMetadata.parent_type === "database_id") {
    return "Database";
  }

  return null;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
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
  } else {
    return "Now";
  }
}

interface ActivityCardProps {
  activity: GitHubActivity & { content?: string | null };
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const icon = getActivityIcon(activity.activity_type, activity.metadata);
  const timeAgo = formatTimeAgo(activity.occurred_at);

  const isNotionActivity = activity.provider === "notion";
  const isGitHubActivity = activity.provider === "github";

  const commits =
    isGitHubActivity && activity.activity_type === "commit"
      ? getCommitsFromMetadata(activity.metadata)
      : [];
  const hasMultipleCommits = commits.length > 1;

  const notionLocationBadge = isNotionActivity
    ? getNotionLocationBadge(activity.metadata)
    : null;
  const notionMetadata = (
    isNotionActivity ? activity.metadata : null
  ) as NotionActivityMetadata | null;

  return (
    <div className="group relative flex gap-3 py-3 px-3 -mx-3 rounded-xl hover:bg-muted/30 transition-colors">
      {/* Icon */}
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0 mt-0.5">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {activity.title}
          </h4>
          <time
            dateTime={activity.occurred_at}
            className="text-xs text-muted-foreground flex-shrink-0"
          >
            {timeAgo}
          </time>
        </div>

        {activity.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}

        {isNotionActivity && activity.content && (
          <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1.5 line-clamp-2 italic">
            {activity.content}
          </p>
        )}

        {hasMultipleCommits && (
          <div className="mt-2 space-y-1">
            {commits.slice(0, 3).map((commit) => {
              const firstLine = commit.message.split("\n")[0];
              const shortSha = commit.sha.substring(0, 7);

              return (
                <div
                  key={commit.sha}
                  className="flex items-start gap-2 text-xs"
                >
                  <code className="flex-shrink-0 px-1.5 py-0.5 bg-muted rounded font-mono text-[10px] text-muted-foreground">
                    {shortSha}
                  </code>
                  <span className="text-muted-foreground truncate">
                    {firstLine}
                  </span>
                </div>
              );
            })}
            {commits.length > 3 && (
              <p className="text-xs text-muted-foreground/60">
                +{commits.length - 3} more commits
              </p>
            )}
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {isGitHubActivity && activity.repo_name && (
            <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
              {activity.repo_name}
            </span>
          )}

          {isNotionActivity && notionLocationBadge && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
              <FolderIcon className="h-3 w-3" />
              {notionLocationBadge}
            </span>
          )}

          {isNotionActivity && notionMetadata && (
            <span className="text-xs text-muted-foreground capitalize">
              {notionMetadata.object_type === "database" ? "Database" : "Page"}
            </span>
          )}
        </div>
      </div>

      {/* External Link */}
      {activity.url && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isNotionActivity ? "View in Notion" : "View on GitHub"}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact activity item for use inside expanded repo groups
 * Shows: icon, title, relative time - single line
 */
function formatTimeAgoCompact(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (diffDays > 0) {
    return `${diffDays}d`;
  } else if (diffHours > 0) {
    return `${diffHours}h`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  }
  return "now";
}

function getCompactIcon(activityType: string) {
  const baseClass = "h-3 w-3 flex-shrink-0";

  switch (activityType) {
    case "commit":
      return <GitCommitIcon className={`${baseClass} text-muted-foreground`} />;
    case "pr_created":
      return <GitPullRequestIcon className={`${baseClass} text-green-500`} />;
    case "pr_reviewed":
      return <GitBranchIcon className={`${baseClass} text-blue-500`} />;
    case "star":
      return <StarIcon className={`${baseClass} text-amber-500`} />;
    case "issue":
      return <MessageSquareIcon className={`${baseClass} text-muted-foreground`} />;
    default:
      return <CircleIcon className={`${baseClass} text-muted-foreground`} />;
  }
}

interface CompactActivityItemProps {
  activity: GitHubActivity;
}

export function CompactActivityItem({ activity }: CompactActivityItemProps) {
  const icon = getCompactIcon(activity.activity_type);
  const timeAgo = formatTimeAgoCompact(activity.occurred_at);

  return (
    <a
      href={activity.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {icon}
      <span className="flex-1 text-xs text-foreground truncate group-hover:text-primary transition-colors">
        {activity.title}
      </span>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">
        {timeAgo}
      </span>
    </a>
  );
}
