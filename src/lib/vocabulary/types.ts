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
  /** Marked as learned ("I know this") by the student (RF06). */
  learned: boolean;
}

export interface CreateWordInput {
  term: string;
  meaning?: string;
  example?: string;
  sessionId?: string;
}

export interface UpdateWordInput {
  term?: string;
  meaning?: string;
  example?: string;
  learned?: boolean;
  sessionIds?: string[];
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
