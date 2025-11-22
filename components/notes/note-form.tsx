"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createNote } from "@/app/actions/notes";
import { toast } from "sonner";

interface NoteFormProps {
  onNoteCreated: () => void;
}

export function NoteForm({ onNoteCreated }: NoteFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
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
        toast.success("Note created successfully");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you learning? What did you discover? What challenged you today?"
          className="min-h-[120px] resize-none text-base leading-relaxed"
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          <p
            className={`text-xs ${
              isOverLimit
                ? "text-destructive font-medium"
                : isNearLimit
                ? "text-orange-500"
                : "text-muted-foreground"
            }`}
          >
            {characterCount} / {maxCharacters} characters
          </p>
          <Button
            type="submit"
            disabled={isSubmitting || !content.trim() || isOverLimit}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSubmitting ? "Adding..." : "Add Note"}
          </Button>
        </div>
      </div>
    </form>
  );
}
