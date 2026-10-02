"use client";

import { createContext, useContext } from "react";
import { formatIssuePath, type ValidationIssue } from "@/lib/activities/validate";

export type Path = (string | number)[];

/** "content", "questions", 2 → "content.questions[2]" (also the field's data-path). */
export const pathKey = (path: Path) => formatIssuePath(path);

/** Schema messages, said the way an author understands them. */
export function friendlyMessage(message: string): string {
  if (/expected string to have >=1 characters/i.test(message)) return "Required";
  if (/expected array to have >=(\d+) items/i.test(message))
    return message.replace(/.*>=(\d+) items.*/i, "Add at least $1");
  if (/expected array to have <=(\d+) items/i.test(message))
    return message.replace(/.*<=(\d+) items.*/i, "At most $1");
  if (/expected string, received undefined/i.test(message)) return "Required";
  if (message === "Each question needs at least one correct option")
    return "Mark one option as correct";
  return message;
}

type Errors = { errorAt: (path: Path) => string | undefined };

const ErrorsContext = createContext<Errors>({ errorAt: () => undefined });

export function ErrorsProvider({
  issues,
  isVisible = () => true,
  children,
}: {
  issues: readonly ValidationIssue[];
  /** Whether a field's error shows yet (e.g. only after it was visited, in a new activity). */
  isVisible?: (key: string) => boolean;
  children: React.ReactNode;
}) {
  const byPath = new Map<string, string>();
  for (const issue of issues) {
    const key = pathKey(issue.path);
    if (!byPath.has(key) && isVisible(key)) byPath.set(key, friendlyMessage(issue.message));
  }
  return (
    <ErrorsContext.Provider value={{ errorAt: (path) => byPath.get(pathKey(path)) }}>
      {children}
    </ErrorsContext.Provider>
  );
}

export const useFieldError = (path: Path) => useContext(ErrorsContext).errorAt(path);
