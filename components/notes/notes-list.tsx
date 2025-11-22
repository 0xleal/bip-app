'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteNote } from '@/app/actions/notes';
import { toast } from 'sonner';
import type { ManualNote } from '@/lib/notes/types';
import { Trash2 } from 'lucide-react';

interface NotesListProps {
  notes: ManualNote[];
  onNoteDeleted: () => void;
}

export function NotesList({ notes, onNoteDeleted }: NotesListProps) {
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    // Simple confirmation
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    setDeletingNoteId(noteId);

    try {
      const result = await deleteNote(noteId);

      if (result.error) {
        toast.error('Failed to delete note', {
          description: result.error,
        });
      } else {
        toast.success('Note deleted successfully');
        onNoteDeleted();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('An unexpected error occurred');
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-base text-muted-foreground leading-relaxed">
          No notes yet. Add your first learning or discovery!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <Card
          key={note.id}
          className="transition-all hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {note.content}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {formatDate(note.created_at || '')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(note.id)}
                disabled={deletingNoteId === note.id}
                className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
