'use client';

import { Button } from '@/components/ui/button';
import type { DateRange } from '@/lib/github/types';

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({
  dateRange,
  onDateRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <span className="text-sm font-medium text-foreground">
        Showing data from:
      </span>
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
    </div>
  );
}
