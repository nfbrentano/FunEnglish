"use client";

import { Plus, X } from "lucide-react";
import { strings } from "@/lib/strings";
import { asArray, asObject, asText, Field, ListError, TextField, type Json } from "./fields";
import type { Path } from "./form-context";
import { ItemList } from "./item-list";
import { MediaEditor } from "./media-editor";

const t = strings.admin.form;
const STEP = 100;
const MAX_CATEGORIES = 6;
const MAX_ROWS = 6;

const rowCount = (categories: Json[]) =>
  Math.max(0, ...categories.map((c) => asArray(c.clues).length));
const valueFor = (row: number) => (row + 1) * STEP;
const emptyClue = (row: number): Json => ({ value: valueFor(row), question: "", answer: "" });

/**
 * Quiz Board: a grid of categories × values. Rows are added to every category at once, with the
 * next value (100, 200, 300…) (RF03, CA04).
 */
export function QuizBoardEditor({
  value,
  onChange,
  path,
}: {
  value: unknown;
  onChange: (value: Json) => void;
  path: Path;
}) {
  const content = asObject(value);
  const categories = asArray<Json>(content.categories);
  const rows = rowCount(categories);
  const setCategories = (next: Json[]) => onChange({ ...content, categories: next });

  const addRow = () =>
    setCategories(
      categories.map((c) => ({ ...c, clues: [...asArray<Json>(c.clues), emptyClue(rows)] })),
    );
  const removeRow = (row: number) =>
    setCategories(
      categories.map((c) => ({ ...c, clues: asArray<Json>(c.clues).filter((_, i) => i !== row) })),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-fg-secondary">{t.boardSize(categories.length, rows)}</p>
        <button
          type="button"
          onClick={addRow}
          disabled={rows >= MAX_ROWS}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-border-strong px-4 text-sm hover:border-accent disabled:opacity-40"
        >
          <Plus aria-hidden="true" className="size-4" />
          {t.addRow(valueFor(rows))}
        </button>
        {rows > 3 && (
          <button
            type="button"
            onClick={() => removeRow(rows - 1)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm text-fg-secondary hover:text-error"
          >
            <X aria-hidden="true" className="size-4" />
            {t.removeRow(valueFor(rows - 1))}
          </button>
        )}
      </div>
      <ItemList
        label={t.categories}
        itemLabel={(i) => t.category(i + 1)}
        addLabel={t.addCategory}
        items={categories}
        onChange={setCategories}
        create={() => ({
          name: "",
          clues: Array.from({ length: Math.max(rows, 3) }, (_, r) => emptyClue(r)),
        })}
        path={[...path, "categories"]}
        min={3}
        max={MAX_CATEGORIES}
        render={(category, c, update) => {
          const categoryPath = [...path, "categories", c];
          const clues = asArray<Json>(category.clues);
          return (
            <div className="space-y-4">
              <TextField
                label={t.categoryName}
                path={[...categoryPath, "name"]}
                value={asText(category.name)}
                onChange={(name) => update({ ...category, name })}
              />
              <ListError path={[...categoryPath, "clues"]} />
              <ol className="space-y-3">
                {clues.map((clue, r) => {
                  const cluePath = [...categoryPath, "clues", r];
                  const setClue = (next: Json) =>
                    update({ ...category, clues: clues.map((x, i) => (i === r ? next : x)) });
                  return (
                    <li key={r} className="space-y-3 rounded-xl border border-border-subtle p-3">
                      <div className="flex flex-wrap gap-3">
                        <Field label={t.value} path={[...cluePath, "value"]}>
                          {(props) => (
                            <input
                              {...props}
                              type="number"
                              min={1}
                              step={STEP}
                              value={typeof clue.value === "number" ? clue.value : ""}
                              onChange={(e) =>
                                setClue({
                                  ...clue,
                                  value: Math.max(1, Math.round(Number(e.target.value))),
                                })
                              }
                              className={`${props.className} sm:w-28`}
                            />
                          )}
                        </Field>
                        <TextField
                          label={t.clueQuestion(
                            asText(category.name) || t.category(c + 1),
                            valueFor(r),
                          )}
                          path={[...cluePath, "question"]}
                          value={asText(clue.question)}
                          onChange={(question) => setClue({ ...clue, question })}
                        />
                        <TextField
                          label={t.answer}
                          path={[...cluePath, "answer"]}
                          value={asText(clue.answer)}
                          onChange={(answer) => setClue({ ...clue, answer })}
                        />
                      </div>
                      <MediaEditor
                        value={clue.media}
                        path={[...cluePath, "media"]}
                        onChange={(media) => {
                          const { media: _old, ...rest } = clue;
                          void _old;
                          setClue(media ? { ...rest, media } : rest);
                        }}
                      />
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        }}
      />
    </div>
  );
}
