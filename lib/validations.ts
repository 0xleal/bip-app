import { z } from "zod";

export const noteSchema = z.object({
  content: z
    .string()
    .min(1, "Note cannot be empty")
    .max(5000, "Note cannot exceed 5000 characters")
    .transform((val) => val.trim()),
});

export const noteIdSchema = z.object({
  id: z.string().uuid("Invalid note ID"),
});

export const contentGenerationSchema = z.object({
  dateRange: z.enum(["24h", "7d", "30d", "custom"]),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  includeGitHubActivity: z.boolean().default(true),
  includeManualNotes: z.boolean().default(true),
});

export const dateRangeSchema = z.object({
  range: z.enum(["24h", "7d", "30d", "custom"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type NoteInput = z.infer<typeof noteSchema>;
export type NoteIdInput = z.infer<typeof noteIdSchema>;
export type ContentGenerationInput = z.infer<typeof contentGenerationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
