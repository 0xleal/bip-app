'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RateLimitUsage } from '@/lib/rate-limit';

interface QuotaDisplayProps {
  usage: RateLimitUsage | null;
  loading?: boolean;
}

export function QuotaDisplay({ usage, loading }: QuotaDisplayProps) {
  if (loading || !usage) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-2 bg-muted animate-pulse rounded w-3/4" />
      </div>
    );
  }

  const dailyPercentage = (usage.dailyCount / (usage.dailyCount + usage.dailyRemaining)) * 100;
  const isLowQuota = usage.dailyRemaining <= 2;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily quota</span>
          <span className="font-medium text-foreground">
            {usage.dailyRemaining} generations left today
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isLowQuota ? 'bg-orange-500' : 'bg-primary'
            }`}
            style={{ width: `${dailyPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Resets at {usage.dailyResetAt.toLocaleTimeString()}
        </p>
      </div>

      {isLowQuota && usage.dailyRemaining > 0 && (
        <Alert>
          <AlertDescription className="text-sm">
            You have {usage.dailyRemaining} generation{usage.dailyRemaining !== 1 ? 's' : ''} remaining today. Use them wisely!
          </AlertDescription>
        </Alert>
      )}

      <div className="pt-2 border-t border-border/50">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Weekly quota</span>
          <span>
            {usage.weeklyRemaining} of {usage.weeklyRemaining + usage.weeklyCount} left
          </span>
        </div>
      </div>
    </div>
  );
}
