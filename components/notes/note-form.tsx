"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createNote } from "@/app/actions/notes";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteFormProps {
  onNoteCreated: () => void;
}

export function NoteForm({ onNoteCreated }: NoteFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNote(content);

      if (result.error) {
        toast.error("Failed to create note", {
          description: result.error,
        });
      } else {
        toast.success("Note added");
        setContent("");
        onNoteCreated();
      }
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = content.length;
  const maxCharacters = 5000;
  const isNearLimit = characterCount > maxCharacters * 0.8;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you learning? What did you discover?"
          className="min-h-[100px] pr-12 text-sm leading-relaxed resize-none"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={isSubmitting || !content.trim() || isOverLimit}
          size="icon"
          className="absolute right-2 bottom-2 h-8 w-8"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p
        className={cn(
          "text-xs",
          isOverLimit
            ? "text-destructive font-medium"
            : isNearLimit
              ? "text-orange-500"
              : "text-muted-foreground/60",
        )}
      >
        {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
      </p>
    </form>
  );
}
