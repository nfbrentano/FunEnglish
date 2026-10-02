"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { blankAnswers, makeBlank, removeBlank, setBlankAnswers } from "@/lib/admin/blanks";
import { strings } from "@/lib/strings";
import {
  asArray,
  asObject,
  asText,
  Field,
  inputClasses,
  ListField,
  TextField,
  withOptional,
  type Json,
} from "./fields";
import type { Path } from "./form-context";
import { ItemList } from "./item-list";
import { MediaEditor } from "./media-editor";

const t = strings.admin.form;

/** Fill in the blanks: sentences with [[blanks]], made by selecting words (RF02, CA03). */
export function FillBlanksEditor({
  value,
  onChange,
  path,
}: {
  value: unknown;
  onChange: (value: Json) => void;
  path: Path;
}) {
  const content = asObject(value);
  const credit = content.credit ? asObject(content.credit) : null;
  return (
    <div className="space-y-6">
      <Field label={t.mode} path={[...path, "mode"]}>
        {(props) => (
          <select
            {...props}
            value={asText(content.mode) || "typing"}
            onChange={(e) => onChange({ ...content, mode: e.target.value })}
            className={`${props.className} sm:w-60`}
          >
            <option value="typing">{t.modeTyping}</option>
            <option value="word-bank">{t.modeWordBank}</option>
          </select>
        )}
      </Field>

      <ItemList
        label={t.sentences}
        itemLabel={(i) => t.sentence(i + 1)}
        addLabel={t.addSentence}
        items={asArray<Json>(content.items)}
        onChange={(items) => onChange({ ...content, items })}
        create={() => ({ text: "" })}
        path={[...path, "items"]}
        min={1}
        max={100}
        render={(item, i, update) => (
          <SentenceFields item={item} onChange={update} path={[...path, "items", i]} />
        )}
      />

      <ListField
        label={t.distractors}
        path={[...path, "distractors"]}
        hint={t.distractorsHint}
        value={asArray<string>(content.distractors)}
        onChange={(distractors) => onChange({ ...content, distractors })}
      />

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={credit !== null}
            onChange={(e) => {
              const { credit: _old, ...rest } = content;
              void _old;
              onChange(
                e.target.checked ? { ...rest, credit: { title: "", artist: "", url: "" } } : rest,
              );
            }}
            className="size-4 accent-(--accent)"
          />
          {t.credit}
        </label>
        {credit && (
          <div className="flex flex-wrap gap-3">
            {(["title", "artist", "url"] as const).map((key) => (
              <TextField
                key={key}
                label={t.creditFields[key]}
                path={[...path, "credit", key]}
                value={asText(credit[key])}
                onChange={(v) => onChange({ ...content, credit: { ...credit, [key]: v } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SentenceFields({
  item,
  onChange,
  path,
}: {
  item: Json;
  onChange: (item: Json) => void;
  path: Path;
}) {
  const text = asText(item.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const blanks = blankAnswers(text);
  const setText = (next: string) => onChange({ ...item, text: next });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t.sentenceText} path={[...path, "text"]} hint={t.sentenceHint}>
          {(props) => (
            <input
              {...props}
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onSelect={(e) => {
                const { selectionStart: start, selectionEnd: end } = e.currentTarget;
                setSelection(start !== null && end !== null && end > start ? [start, end] : null);
              }}
            />
          )}
        </Field>
        <button
          type="button"
          // Keep the text selected while clicking.
          onMouseDown={(e) => e.preventDefault()}
          disabled={!selection}
          onClick={() => {
            if (!selection) return;
            setText(makeBlank(text, selection[0], selection[1]));
            setSelection(null);
            inputRef.current?.focus();
          }}
          className="min-h-11 rounded-full border border-border-strong px-4 text-sm hover:border-accent disabled:opacity-40"
        >
          {t.makeBlank}
        </button>
      </div>

      {blanks.length > 0 && (
        <ul className="space-y-2" aria-label={t.blanks}>
          {blanks.map((answers, b) => (
            <li key={b} className="flex flex-wrap items-end gap-2">
              <span className="min-h-11 content-center rounded-full bg-accent-muted px-3 text-sm text-accent">
                {t.blank(b + 1)}: {answers[0]}
              </span>
              <div className="min-w-48 flex-1 space-y-1.5">
                <label htmlFor={`${path.join("-")}-alt-${b}`} className="sr-only">
                  {t.alternativesFor(answers[0] ?? "", b + 1)}
                </label>
                <input
                  id={`${path.join("-")}-alt-${b}`}
                  defaultValue={answers.slice(1).join(", ")}
                  key={answers.join("|")}
                  placeholder={t.alternatives}
                  onBlur={(e) => {
                    const alternatives = e.target.value
                      .split(",")
                      .map((a) => a.trim())
                      .filter(Boolean);
                    setText(setBlankAnswers(text, b, [answers[0], ...alternatives]));
                  }}
                  className={inputClasses()}
                />
              </div>
              <button
                type="button"
                aria-label={t.removeBlank(b + 1)}
                onClick={() => setText(removeBlank(text, b))}
                className="flex size-11 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-error"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <TextField
        label={t.hint}
        path={[...path, "hint"]}
        value={asText(item.hint)}
        onChange={(hint) => onChange(withOptional(item, "hint", hint))}
      />
      <MediaEditor
        value={item.media}
        path={[...path, "media"]}
        onChange={(media) => {
          const { media: _old, ...rest } = item;
          void _old;
          onChange(media ? { ...rest, media } : rest);
        }}
      />
    </div>
  );
}
