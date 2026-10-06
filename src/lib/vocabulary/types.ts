export interface StudentWord {
  /** Normalized slug identifier for deduplication (RNF01). */
  id: string;
  /** The word or expression taught in class (1-80 chars). */
  term: string;
  /** Meaning or translation in Portuguese or English definition (up to 200 chars). */
  meaning?: string;
  /** Example sentence demonstrating usage in context (up to 200 chars). */
  example?: string;
  /** IDs of sessions where this word was practiced/seen (up to 50). */
  sessionIds: string[];
  /** ISO timestamp when the word was first added to this student's bank. */
  firstAddedAt: string;
  /** ISO timestamp when the word was last added or encountered. */
  lastAddedAt: string;
  /** Marked as learned ("I know this") by the student (RF06); in SRS, acts as suspended (RF08). */
  learned: boolean;
  /** Next review date string (YYYY-MM-DD, RNF01, RNF06). */
  dueAt?: string;
  /** Days between reviews (RNF01). */
  intervalDays?: number;
  /** Ease factor multiplier (default 2.5, min 1.3, RNF01). */
  ease?: number;
  /** Repetitions count (RNF01). */
  reps?: number;
  /** Number of times forgotten / Again (RNF01). */
  lapses?: number;
  /** ISO timestamp of last review completion (RNF01). */
  lastReviewedAt?: string;
}

export interface CreateWordInput {
  term: string;
  meaning?: string;
  example?: string;
  sessionId?: string;
  dueAt?: string;
  intervalDays?: number;
  ease?: number;
  reps?: number;
  lapses?: number;
}

export interface UpdateWordInput {
  term?: string;
  meaning?: string;
  example?: string;
  learned?: boolean;
  sessionIds?: string[];
  dueAt?: string;
  intervalDays?: number;
  ease?: number;
  reps?: number;
  lapses?: number;
  lastReviewedAt?: string;
}

export interface SessionWordInput {
  term: string;
  meaning?: string;
  example?: string;
}

export interface RecordSessionVocabularyParams {
  studentIds: string[];
  words: SessionWordInput[];
  sessionId: string;
}
