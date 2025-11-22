'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon, AlertCircleIcon } from 'lucide-react';
import { syncGitHubActivity } from '@/app/actions/github';
import type { DateRange } from '@/lib/github/types';
import { toast } from 'sonner';

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
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

interface ActivityFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  lastSynced?: string | null;
  onSyncComplete?: () => void;
}

export function ActivityFilters({
  dateRange,
  onDateRangeChange,
  lastSynced,
  onSyncComplete,
}: ActivityFiltersProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setRateLimitWarning(false);

    try {
      const result = await syncGitHubActivity();

      if (result.success) {
        toast.success('Synced successfully', {
          description: `Added ${result.newItemsCount} new activities`,
        });

        // Check for rate limit warning
        if (result.rateLimitRemaining < 100) {
          setRateLimitWarning(true);
          toast.warning('Rate limit warning', {
            description: `Only ${result.rateLimitRemaining} requests remaining`,
          });
        }

        // Notify parent to refresh data
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        toast.error('Sync failed', {
          description: result.error || 'Failed to sync activities',
        });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Sync failed', {
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={dateRange === '24h' ? 'default' : 'outline'}
          onClick={() => onDateRangeChange('24h')}
          size="sm"
        >
          Last 24h
        </Button>
        <Button
          variant={dateRange === '7d' ? 'default' : 'outline'}
          onClick={() => onDateRangeChange('7d')}
          size="sm"
        >
          Last 7 days
        </Button>
        <Button
          variant={dateRange === '30d' ? 'default' : 'outline'}
          onClick={() => onDateRangeChange('30d')}
          size="sm"
        >
          Last 30 days
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {lastSynced && (
          <span className="text-sm text-muted-foreground">
            Last synced: {formatTimeAgo(lastSynced)}
          </span>
        )}

        {rateLimitWarning && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
            <AlertCircleIcon className="h-4 w-4" />
            <span className="text-xs">Rate limit low</span>
          </div>
        )}

        <Button
          onClick={handleSync}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <RefreshCwIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>
    </div>
  );
}
