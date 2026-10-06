"use client";

import type { ActivityType } from "@/lib/activities/schema/activity";
import type { Json } from "./fields";
import { FillBlanksEditor } from "./fill-blanks-editor";
import { FlashcardsEditor } from "./flashcards-editor";
import type { Path } from "./form-context";
import { PromptCardsEditor } from "./prompt-cards-editor";
import { QuizBoardEditor } from "./quiz-board-editor";
import { QuizEditor } from "./quiz-editor";
import { SentenceOrderEditor } from "./sentence-order-editor";

type ContentEditor = (props: {
  value: unknown;
  onChange: (value: Json) => void;
  path: Path;
}) => React.ReactNode;

/**
 * One form per activity type (spec: gestão completa, RF01–RF03). A new type registers its
 * editor here, next to its player plugin.
 */
export const CONTENT_EDITORS: Record<ActivityType, ContentEditor> = {
  quiz: QuizEditor,
  "fill-blanks": FillBlanksEditor,
  flashcards: FlashcardsEditor,
  "quiz-board": QuizBoardEditor,
  "prompt-cards": PromptCardsEditor,
  "sentence-order": SentenceOrderEditor,
};

export function StructuredEditor({
  type,
  value,
  onChange,
}: {
  type: ActivityType;
  value: unknown;
  onChange: (value: Json) => void;
}) {
  const Editor = CONTENT_EDITORS[type];
  return <Editor value={value} onChange={onChange} path={["content"]} />;
}
