"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { GitHubActivitySection } from "@/components/activity/github-activity-section";
import { NotionActivitySection } from "@/components/activity/notion-activity-section";
import { ManualNotesSection } from "@/components/notes/manual-notes-section";
import { ContentGenerationSection } from "@/components/content/content-generation-section";
import { ToneOfVoiceSection } from "@/components/twitter/tone-of-voice-section";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import type { DateRange } from "@/lib/github/types";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");

  return (
    <DashboardLayout>
      {/* Page Header with Date Filter */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
              Your Activity
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track, analyze, and share your development journey
            </p>
          </div>
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-16">
        {/* Content Generation - Primary Action */}
        <section className="animate-slide-up stagger-1">
          <ContentGenerationSection dateRange={dateRange} />
        </section>

        {/* Tone of Voice */}
        <section className="animate-slide-up stagger-2">
          <ToneOfVoiceSection />
        </section>

        {/* Activity Sources */}
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="animate-slide-up stagger-3">
            <GitHubActivitySection dateRange={dateRange} />
          </section>

          <section className="animate-slide-up stagger-4">
            <NotionActivitySection dateRange={dateRange} />
          </section>
        </div>

        {/* Manual Notes */}
        <section className="animate-slide-up stagger-5">
          <ManualNotesSection dateRange={dateRange} />
        </section>
      </div>
    </DashboardLayout>
  );
}
