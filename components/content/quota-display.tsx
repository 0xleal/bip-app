"use client";

import { cn } from "@/lib/utils";
import type { RateLimitUsage } from "@/lib/rate-limit";

interface QuotaDisplayProps {
  usage: RateLimitUsage | null;
  loading?: boolean;
  compact?: boolean;
}

export function QuotaDisplay({ usage, loading, compact }: QuotaDisplayProps) {
  if (loading || !usage) {
    return (
      <div className={cn("space-y-2", compact && "w-24")}>
        <div className="h-3 bg-muted animate-pulse rounded" />
        {!compact && <div className="h-2 bg-muted animate-pulse rounded w-3/4" />}
      </div>
    );
  }

  const dailyPercentage =
    (usage.dailyCount / (usage.dailyCount + usage.dailyRemaining)) * 100;
  const isLowQuota = usage.dailyRemaining <= 2;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isLowQuota ? "bg-orange-500" : "bg-primary",
            )}
            style={{ width: `${dailyPercentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {usage.dailyRemaining} left
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Daily</span>
          <span className="font-medium text-foreground">
            {usage.dailyRemaining} left
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isLowQuota ? "bg-orange-500" : "bg-primary",
            )}
            style={{ width: `${dailyPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Resets {usage.dailyResetAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      <div className="pt-3 border-t border-border/50">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Weekly</span>
          <span>
            {usage.weeklyRemaining}/{usage.weeklyRemaining + usage.weeklyCount}
          </span>
        </div>
      </div>
    </div>
  );
}
