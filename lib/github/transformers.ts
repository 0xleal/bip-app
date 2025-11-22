import type { GitHubActivityInsert } from './types';

/**
 * Generic type for GitHub event payloads
 * Using unknown type with explicit property access to handle dynamic GitHub API responses
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GitHubEvent = any;

/**
 * Transform GitHub Events API response to our activity schema
 *
 * @param events - Array of events from GitHub API
 * @param userId - User's database ID
 * @returns Array of activities ready for database insertion
 */
export function transformEventsToActivities(
  events: GitHubEvent[],
  userId: string
): GitHubActivityInsert[] {
  const activities: GitHubActivityInsert[] = [];

  for (const event of events) {
    const activity = transformSingleEvent(event, userId);
    if (activity) {
      activities.push(activity);
    }
  }

  return activities;
}

/**
 * Transform a single GitHub event to an activity
 * Returns null if event type is not supported
 */
function transformSingleEvent(event: GitHubEvent, userId: string): GitHubActivityInsert | null {
  const repoName = event.repo?.name || 'Unknown';
  const createdAt = event.created_at;

  switch (event.type) {
    case 'PushEvent':
      return transformPushEvent(event, userId, repoName, createdAt);

    case 'PullRequestEvent':
      return transformPullRequestEvent(event, userId, repoName, createdAt);

    case 'PullRequestReviewEvent':
      return transformPullRequestReviewEvent(event, userId, repoName, createdAt);

    case 'WatchEvent':
      return transformWatchEvent(event, userId, repoName, createdAt);

    case 'IssuesEvent':
      return transformIssuesEvent(event, userId, repoName, createdAt);

    case 'IssueCommentEvent':
      return transformIssueCommentEvent(event, userId, repoName, createdAt);

    case 'CreateEvent':
      // Only track branch/tag creation, not repo creation
      if (event.payload?.ref_type === 'branch' || event.payload?.ref_type === 'tag') {
        return transformCreateEvent(event, userId, repoName, createdAt);
      }
      return null;

    default:
      // Unsupported event type
      return null;
  }
}

/**
 * Transform PushEvent to commit activity
 */
function transformPushEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  const commits = event.payload?.commits || [];
  const commitCount = commits.length;
  const firstCommit = commits[0];
  const commitMessage = firstCommit?.message || 'Pushed commits';

  // Extract first line of commit message
  const title = commitMessage.split('\n')[0].slice(0, 200);

  return {
    user_id: userId,
    provider: 'github',
    activity_type: 'commit',
    title,
    description: `Pushed ${commitCount} commit${commitCount > 1 ? 's' : ''} to ${repoName}`,
    url: `https://github.com/${repoName}/commits/${event.payload?.ref?.replace('refs/heads/', '')}`,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      commit_count: commitCount,
      ref: event.payload?.ref,
      head: event.payload?.head,
    },
    occurred_at: createdAt,
  };
}

/**
 * Transform PullRequestEvent to PR activity
 */
function transformPullRequestEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  const pr = event.payload?.pull_request;
  const action = event.payload?.action;
  const title = pr?.title || 'Pull Request';
  const description = pr?.body?.slice(0, 200) || `${action} pull request`;

  return {
    user_id: userId,
    provider: 'github',
    activity_type: action === 'opened' ? 'pr_created' : 'pr_created',
    title,
    description,
    url: pr?.html_url,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      pr_number: pr?.number,
      action,
      state: pr?.state,
    },
    occurred_at: createdAt,
  };
}

/**
 * Transform PullRequestReviewEvent to review activity
 */
function transformPullRequestReviewEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  const review = event.payload?.review;
  const pr = event.payload?.pull_request;
  const title = `Reviewed PR: ${pr?.title || 'Pull Request'}`;
  const description = review?.body?.slice(0, 200) || `Reviewed pull request #${pr?.number}`;

  return {
    user_id: userId,
    provider: 'github',
    activity_type: 'pr_reviewed',
    title,
    description,
    url: review?.html_url || pr?.html_url,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      pr_number: pr?.number,
      review_id: review?.id,
      review_state: review?.state,
    },
    occurred_at: createdAt,
  };
}

/**
 * Transform WatchEvent to star activity
 */
function transformWatchEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  return {
    user_id: userId,
    provider: 'github',
    activity_type: 'star',
    title: `Starred ${repoName}`,
    description: `Starred repository ${repoName}`,
    url: `https://github.com/${repoName}`,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      action: event.payload?.action,
    },
    occurred_at: createdAt,
  };
}

/**
 * Transform IssuesEvent to issue activity
 */
function transformIssuesEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  const issue = event.payload?.issue;
  const action = event.payload?.action;
  const title = issue?.title || 'Issue';
  const description = issue?.body?.slice(0, 200) || `${action} issue`;

  return {
    user_id: userId,
    provider: 'github',
    activity_type: 'issue',
    title: `${action === 'opened' ? 'Opened' : action === 'closed' ? 'Closed' : 'Updated'} issue: ${title}`,
    description,
    url: issue?.html_url,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      issue_number: issue?.number,
      action,
      state: issue?.state,
    },
    occurred_at: createdAt,
  };
}

/**
 * Transform IssueCommentEvent to comment activity
 */
function transformIssueCommentEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  const comment = event.payload?.comment;
  const issue = event.payload?.issue;
  const title = `Commented on: ${issue?.title || 'issue'}`;
  const description = comment?.body?.slice(0, 200) || 'Added a comment';

  return {
    user_id: userId,
    provider: 'github',
    activity_type: 'issue',
    title,
    description,
    url: comment?.html_url,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      issue_number: issue?.number,
      comment_id: comment?.id,
      action: 'commented',
    },
    occurred_at: createdAt,
  };
}

/**
 * Transform CreateEvent to branch/tag creation activity
 */
function transformCreateEvent(event: GitHubEvent, userId: string, repoName: string, createdAt: string): GitHubActivityInsert {
  const refType = event.payload?.ref_type;
  const ref = event.payload?.ref;
  const title = `Created ${refType}: ${ref}`;

  return {
    user_id: userId,
    provider: 'github',
    activity_type: 'commit',
    title,
    description: `Created ${refType} ${ref} in ${repoName}`,
    url: `https://github.com/${repoName}`,
    repo_name: repoName,
    metadata: {
      event_id: event.id,
      ref_type: refType,
      ref,
    },
    occurred_at: createdAt,
  };
}
