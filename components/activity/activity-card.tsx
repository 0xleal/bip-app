import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import type { GitHubActivity } from "@/lib/github/types";
import type { NotionActivityMetadata } from "@/lib/notion/types";

/**
 * Extract commits from activity metadata
 */
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

/**
 * Get icon component based on activity type
 */
function getActivityIcon(activityType: string, metadata?: unknown) {
  const iconProps = { className: "h-5 w-5 text-muted-foreground" };

  // Check if this is a Notion activity
  if (
    activityType.startsWith("page_") ||
    activityType.startsWith("database_")
  ) {
    const notionMetadata = metadata as NotionActivityMetadata | undefined;

    if (activityType.startsWith("database_")) {
      return (
        <DatabaseIcon {...iconProps} className="h-5 w-5 text-purple-500" />
      );
    } else if (notionMetadata?.parent_type === "workspace") {
      return <FileTextIcon {...iconProps} className="h-5 w-5 text-blue-500" />;
    } else {
      return <FileTextIcon {...iconProps} className="h-5 w-5 text-gray-500" />;
    }
  }

  // GitHub activity icons
  switch (activityType) {
    case "commit":
      return <GitCommitIcon {...iconProps} />;
    case "pr_created":
      return <GitPullRequestIcon {...iconProps} />;
    case "pr_reviewed":
      return <GitBranchIcon {...iconProps} />;
    case "star":
      return <StarIcon {...iconProps} />;
    case "issue":
      return <MessageSquareIcon {...iconProps} />;
    default:
      return <GitCommitIcon {...iconProps} />;
  }
}

/**
 * Get Notion metadata badge text based on parent type
 */
function getNotionLocationBadge(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  const notionMetadata = metadata as NotionActivityMetadata;

  if (notionMetadata.parent_type === "workspace") {
    return "Workspace";
  } else if (notionMetadata.parent_type === "page_id") {
    return "Nested page";
  } else if (notionMetadata.parent_type === "database_id") {
    return "In database";
  }

  return null;
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
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

interface ActivityCardProps {
  activity: GitHubActivity & { content?: string | null };
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const icon = getActivityIcon(activity.activity_type, activity.metadata);
  const timeAgo = formatTimeAgo(activity.occurred_at);

  // Detect activity provider
  const isNotionActivity = activity.provider === "notion";
  const isGitHubActivity = activity.provider === "github";

  // Get commit details for multi-commit pushes (GitHub)
  const commits =
    isGitHubActivity && activity.activity_type === "commit"
      ? getCommitsFromMetadata(activity.metadata)
      : [];
  const hasMultipleCommits = commits.length > 1;

  // Get Notion metadata
  const notionLocationBadge = isNotionActivity
    ? getNotionLocationBadge(activity.metadata)
    : null;
  const notionMetadata = (
    isNotionActivity ? activity.metadata : null
  ) as NotionActivityMetadata | null;

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

          {/* Show Notion page content preview */}
          {isNotionActivity && activity.content && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-2 mb-2 line-clamp-3 italic">
              {activity.content}
            </p>
          )}

          {/* Show commit breakdown for multi-commit pushes */}
          {hasMultipleCommits && (
            <div className="mt-3 mb-2 space-y-1.5">
              {commits.map((commit) => {
                // Extract first line of commit message
                const firstLine = commit.message.split("\n")[0];
                const shortSha = commit.sha.substring(0, 7);

                return (
                  <div
                    key={commit.sha}
                    className="flex items-start gap-2 text-xs"
                  >
                    <code className="flex-shrink-0 px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                      {shortSha}
                    </code>
                    <span className="text-muted-foreground leading-relaxed">
                      {firstLine}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {/* GitHub repo name */}
            {isGitHubActivity && activity.repo_name && (
              <>
                <span className="font-mono truncate">{activity.repo_name}</span>
                <span>·</span>
              </>
            )}

            {/* Notion location badge */}
            {isNotionActivity && notionLocationBadge && (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  <FolderIcon className="h-3 w-3" />
                  {notionLocationBadge}
                </span>
                <span>·</span>
              </>
            )}

            {/* Notion object type */}
            {isNotionActivity && notionMetadata && (
              <>
                <span className="capitalize">
                  {notionMetadata.object_type === "database"
                    ? "Database"
                    : "Page"}
                </span>
                <span>·</span>
              </>
            )}

            <time dateTime={activity.occurred_at}>{timeAgo}</time>
          </div>
        </div>

        {activity.url && (
          <div className="flex-shrink-0">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2">
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  isNotionActivity ? "View in Notion" : "View on GitHub"
                }
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
