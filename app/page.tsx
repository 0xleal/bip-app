'use client';

import { useState } from 'react';
import { DashboardLayout } from "@/components/dashboard-layout";
import { GitHubActivitySection } from "@/components/activity/github-activity-section";
import { ManualNotesSection } from "@/components/notes/manual-notes-section";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
            Generated Content
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Share Your Work</CardTitle>
              <CardDescription>
                AI-generated content suggestions based on your activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base text-muted-foreground leading-relaxed">
                Coming soon: Generate shareable content from your work
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
