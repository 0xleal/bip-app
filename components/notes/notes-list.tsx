"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteNote } from "@/app/actions/notes";
import { toast } from "sonner";
import type { ManualNote } from "@/lib/notes/types";
import { Trash2, StickyNote } from "lucide-react";

interface NotesListProps {
  notes: ManualNote[];
  onNoteDeleted: () => void;
}

export function NotesList({ notes, onNoteDeleted }: NotesListProps) {
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    setDeletingNoteId(noteId);

    try {
      const result = await deleteNote(noteId);

      if (result.error) {
        toast.error("Failed to delete note", {
          description: result.error,
        });
      } else {
        toast.success("Note deleted");
        onNoteDeleted();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-3">
          <StickyNote className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">No notes yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Add your first learning or discovery
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className="group relative flex gap-3 py-3 px-3 -mx-3 rounded-xl hover:bg-muted/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {note.content}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(note.created_at || "")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(note.id)}
            disabled={deletingNoteId === note.id}
            className="flex-shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            title="Delete note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
