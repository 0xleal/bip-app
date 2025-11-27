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
import { PencilLine } from "lucide-react";
import type { ManualNote } from "@/lib/notes/types";
import type { DateRange } from "@/lib/github/types";

function NotesSkeletonLoader() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-muted/30">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5 mb-3" />
          <Skeleton className="h-3 w-24" />
        </div>
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
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PencilLine className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Capture learnings and discoveries
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <NoteForm onNoteCreated={handleNoteCreated} />

        {error && (
          <div className="text-center py-6 px-4">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">
              Try signing in again or contact support
            </p>
          </div>
        )}

        {!error && loading && <NotesSkeletonLoader />}

        {!error && !loading && (
          <NotesList notes={notes} onNoteDeleted={handleNoteDeleted} />
        )}
      </CardContent>
    </Card>
  );
}
