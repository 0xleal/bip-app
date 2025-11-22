"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteForm } from "./note-form";
import { NotesList } from "./notes-list";
import { getNotes } from "@/app/actions/notes";
import type { ManualNote } from "@/lib/notes/types";
import type { DateRange } from "@/lib/github/types";

function NotesSkeletonLoader() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ManualNotesSectionProps {
  dateRange: DateRange;
}

export function ManualNotesSection({ dateRange }: ManualNotesSectionProps) {
  const [notes, setNotes] = useState<ManualNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getNotes({ dateRange });

      if (result.error) {
        setError(result.error);
        setNotes([]);
      } else if (result.notes) {
        setNotes(result.notes);
      }
    } catch (err) {
      console.error("Error loading notes:", err);
      setError("Failed to load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Load notes on mount and when date range changes
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleNoteCreated = () => {
    loadNotes();
  };

  const handleNoteDeleted = () => {
    loadNotes();
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
        Manual Notes
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Learnings & Discoveries</CardTitle>
          <CardDescription>
            Add notes about what you&apos;re learning and discovering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NoteForm onNoteCreated={handleNoteCreated} />

          {error && (
            <div className="text-center py-8 px-4">
              <p className="text-base text-destructive mb-2">{error}</p>
              <p className="text-sm text-muted-foreground">
                Please try signing in again or contact support if the issue
                persists
              </p>
            </div>
          )}

          {!error && loading && <NotesSkeletonLoader />}

          {!error && !loading && (
            <NotesList notes={notes} onNoteDeleted={handleNoteDeleted} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
