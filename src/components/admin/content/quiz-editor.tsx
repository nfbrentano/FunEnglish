"use client";

import { useId, useState } from "react";
import { strings } from "@/lib/strings";
import { asArray, asObject, asText, TextField, withOptional, type Json } from "./fields";
import type { Path } from "./form-context";
import { ItemList } from "./item-list";
import { MediaEditor } from "./media-editor";

const t = strings.admin.form;
type Option = { text: string; correct?: boolean };

const newQuestion = (): Json => ({
  prompt: "",
  options: [{ text: "", correct: true }, { text: "" }, { text: "" }],
});

/** Quiz: questions, options with the correct one(s), explanation and media (RF01, CA01–CA02). */
export function QuizEditor({
  value,
  onChange,
  path,
}: {
  value: unknown;
  onChange: (value: Json) => void;
  path: Path;
}) {
  const content = asObject(value);
  return (
    <ItemList
      label={t.questions}
      itemLabel={(i) => t.question(i + 1)}
      addLabel={t.addQuestion}
      items={asArray<Json>(content.questions)}
      onChange={(questions) => onChange({ ...content, questions })}
      create={newQuestion}
      path={[...path, "questions"]}
      min={1}
      max={100}
      render={(question, i, update) => (
        <QuestionFields
          question={question}
          onChange={update}
          path={[...path, "questions", i]}
          number={i + 1}
        />
      )}
    />
  );
}

function QuestionFields({
  question,
  onChange,
  path,
  number,
}: {
  question: Json;
  onChange: (question: Json) => void;
  path: Path;
  number: number;
}) {
  const options = asArray<Option>(question.options);
  // "Choose all that apply": several options may be correct (checkboxes instead of radios).
  const [several, setSeveral] = useState(() => options.filter((o) => o.correct).length > 1);
  const group = useId();

  const setCorrect = (index: number, checked: boolean) =>
    onChange({
      ...question,
      options: options.map((o, i) =>
        several
          ? i === index
            ? { ...o, correct: checked }
            : o
          : // One correct answer: picking one clears the others.
            { ...o, correct: i === index },
      ),
    });

  return (
    <div className="space-y-4">
      <TextField
        label={t.prompt}
        path={[...path, "prompt"]}
        multiline
        value={asText(question.prompt)}
        onChange={(prompt) => onChange({ ...question, prompt })}
      />
      <MediaEditor
        value={question.media}
        path={[...path, "media"]}
        onChange={(media) => {
          const { media: _old, ...rest } = question;
          void _old;
          onChange(media ? { ...rest, media } : rest);
        }}
      />
      <ItemList<Option>
        compact
        label={t.options}
        itemLabel={(i) => t.optionOf(i + 1, number)}
        addLabel={t.addOption}
        items={options}
        onChange={(next) => onChange({ ...question, options: next })}
        create={() => ({ text: "" })}
        path={[...path, "options"]}
        min={2}
        max={6}
        leading={(option, i) => (
          <label className="flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-fg-secondary">
            <input
              type={several ? "checkbox" : "radio"}
              name={group}
              checked={option.correct === true}
              onChange={(e) => setCorrect(i, e.target.checked)}
              className="size-4 accent-accent"
              aria-label={t.markCorrect(i + 1, number)}
            />
            <span aria-hidden="true">{t.correct}</span>
          </label>
        )}
        render={(option, i, update) => (
          <TextField
            hideLabel
            label={t.optionOf(i + 1, number)}
            path={[...path, "options", i, "text"]}
            value={option.text}
            onChange={(text) => update({ ...option, text })}
          />
        )}
      />
      <label className="flex items-center gap-2 text-sm text-fg-secondary">
        <input
          type="checkbox"
          checked={several}
          onChange={(e) => {
            setSeveral(e.target.checked);
            // Back to one answer: keep only the first correct option.
            if (!e.target.checked) {
              const first = Math.max(
                options.findIndex((o) => o.correct),
                0,
              );
              onChange({
                ...question,
                options: options.map((o, i) => ({ ...o, correct: i === first })),
              });
            }
          }}
          className="size-4 accent-accent"
        />
        {t.chooseAll}
      </label>
      <TextField
        label={t.explanation}
        path={[...path, "explanation"]}
        hint={t.explanationHint}
        value={asText(question.explanation)}
        onChange={(explanation) => onChange(withOptional(question, "explanation", explanation))}
      />
    </div>
  );
}
