export const MAX_BATCH_STUDENTS = 40;
export const MAX_STUDENT_NAME_LENGTH = 100;

export interface ParseBatchResult {
  names: string[];
  error?: string;
}

/**
 * Parses raw text containing one student name per line.
 * Trims extra whitespace, discards blank lines, and validates limits.
 */
export function parseStudentBatch(
  rawText: string,
  maxAllowed = MAX_BATCH_STUDENTS,
): ParseBatchResult {
  if (!rawText || !rawText.trim()) {
    return { names: [] };
  }

  const lines = rawText.split(/\r?\n/);
  const names: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (trimmed.length > 0) {
      if (trimmed.length > MAX_STUDENT_NAME_LENGTH) {
        return {
          names: [],
          error: `Name "${trimmed.slice(0, 30)}..." exceeds maximum of ${MAX_STUDENT_NAME_LENGTH} characters.`,
        };
      }
      names.push(trimmed);
    }
  }

  if (names.length > maxAllowed) {
    return {
      names: [],
      error: `Cannot add more than ${maxAllowed} students at once (received ${names.length}).`,
    };
  }

  return { names };
}
