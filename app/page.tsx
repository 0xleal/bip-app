'use client';

import { useState } from 'react';
import { DashboardLayout } from "@/components/dashboard-layout";
import { GitHubActivitySection } from "@/components/activity/github-activity-section";
import { ManualNotesSection } from "@/components/notes/manual-notes-section";
import { ContentGenerationSection } from "@/components/content/content-generation-section";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Separator } from "@/components/ui/separator";
import type { DateRange } from "@/lib/github/types";

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Global Date Range Filter */}
        <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        <Separator className="opacity-30" />

        <GitHubActivitySection dateRange={dateRange} />

        <Separator className="opacity-30" />

        <ManualNotesSection dateRange={dateRange} />

        <Separator className="opacity-30" />

        <ContentGenerationSection dateRange={dateRange} />
      </div>
    </DashboardLayout>
  );
}
