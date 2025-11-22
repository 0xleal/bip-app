import type { Tables, TablesInsert } from '@/types/supabase';

/**
 * Manual Note as stored in database
 */
export type ManualNote = Tables<'manual_notes'>;

/**
 * Manual Note for insertion into database
 */
export type ManualNoteInsert = TablesInsert<'manual_notes'>;

/**
 * Result from creating a note
 */
export interface CreateNoteResult {
  note?: ManualNote;
  error?: string;
}

/**
 * Result from getting notes
 */
export interface GetNotesResult {
  notes?: ManualNote[];
  error?: string;
}

/**
 * Result from deleting a note
 */
export interface DeleteNoteResult {
  success: boolean;
  error?: string;
}

/**
 * Options for getting notes
 */
export interface GetNotesOptions {
  dateRange?: '24h' | '7d' | '30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}
