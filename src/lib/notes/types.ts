export const NOTE_CATEGORIES = [
  "pronunciation",
  "grammar",
  "vocabulary",
  "fluency",
  "strength",
  "general",
] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export type NoteVisibility = "private" | "shared";

export const DEFAULT_VISIBILITY_BY_CATEGORY: Record<NoteCategory, NoteVisibility> = {
  pronunciation: "private",
  grammar: "private",
  vocabulary: "private",
  fluency: "private",
  strength: "shared",
  general: "private",
};

export const MAX_NOTE_TEXT_LENGTH = 500;
export const MAX_CORRECTION_TEXT_LENGTH = 500;
export const MAX_NOTES_PAGE_SIZE = 50;
export const MAX_NOTES_PER_STUDENT = 2000;

export interface StudentNote {
  id: string;
  studentId: string;
  category: NoteCategory;
  text: string;
  correction?: string;
  visibility: NoteVisibility;
  resolved: boolean;
  sessionId?: string;
  source?: "lesson" | "homework" | "general";
  homeworkId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteInput {
  category: NoteCategory;
  text: string;
  correction?: string;
  visibility?: NoteVisibility;
  resolved?: boolean;
  sessionId?: string;
  source?: "lesson" | "homework" | "general";
  homeworkId?: string;
}

export interface UpdateNoteInput {
  category?: NoteCategory;
  text?: string;
  correction?: string | null;
  visibility?: NoteVisibility;
  resolved?: boolean;
  sessionId?: string | null;
  source?: "lesson" | "homework" | "general" | null;
  homeworkId?: string | null;
}

export interface NoteFilterOptions {
  category?: NoteCategory | "all";
  visibility?: NoteVisibility | "all";
  status?: "open" | "resolved" | "all";
}

export interface RecurringIssue {
  key: string;
  normalizedText: string;
  sampleText: string;
  sampleCorrection?: string;
  category: NoteCategory;
  count: number;
  classDates: string[]; // ISO or human date strings
  noteIds: string[];
}
