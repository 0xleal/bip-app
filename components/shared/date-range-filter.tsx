"use client";

import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/github/types";

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export function DateRangeFilter({
  dateRange,
  onDateRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/30">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onDateRangeChange(range.value)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-lg",
            "transition-all duration-200 ease-out",
            dateRange === range.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
