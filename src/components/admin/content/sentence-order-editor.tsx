"use client";

import { Plus, Scissors } from "lucide-react";
import { Fragment } from "react";
import { chunksOf, splitByWords } from "@/lib/activities/sentence-order";
import { strings } from "@/lib/strings";
import { asArray, asObject, asText, Field, TextField, withOptional, type Json } from "./fields";
import type { Path } from "./form-context";
import { ItemList } from "./item-list";
import { MediaEditor } from "./media-editor";

const t = strings.admin.form;

/** Sentence Builder: sentences, their pieces and other accepted orders (RF06, CA07). */
export function SentenceOrderEditor({
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
      label={t.sentences}
      itemLabel={(i) => t.sentence(i + 1)}
      addLabel={t.addSentence}
      items={asArray<Json>(content.items)}
      onChange={(items) => onChange({ ...content, items })}
      create={() => ({ sentence: "" })}
      path={[...path, "items"]}
      min={1}
      max={30}
      render={(item, i, update) => (
        <SentenceFields item={item} onChange={update} path={[...path, "items", i]} />
      )}
    />
  );
}

/** Drops `chunks` so the player splits by words again. */
function withoutChunks(item: Json): Json {
  const { chunks: _old, ...rest } = item;
  void _old;
  return rest;
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
  const sentence = asText(item.sentence);
  const manual = Array.isArray(item.chunks);
  const pieces = chunksOf({ sentence, chunks: asArray<string>(item.chunks) });
  const setPieces = (chunks: string[]) => onChange({ ...item, chunks });
  const alternatives = asArray<string>(item.alternatives);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <TextField
          label={t.sentenceText}
          path={[...path, "sentence"]}
          hint={t.orderSentenceHint}
          value={sentence}
          // A new sentence makes the old manual split meaningless.
          onChange={(next) => onChange({ ...withoutChunks(item), sentence: next })}
        />
        <button
          type="button"
          onClick={() => setPieces(splitByWords(sentence))}
          disabled={splitByWords(sentence).length < 2}
          className="min-h-11 rounded-full border border-border-strong px-4 text-sm hover:border-accent disabled:opacity-40"
        >
          {t.splitByWords}
        </button>
        {manual && (
          <button
            type="button"
            onClick={() => onChange(withoutChunks(item))}
            className="min-h-11 rounded-full px-4 text-sm text-fg-secondary hover:bg-secondary hover:text-fg"
          >
            {t.useDefaultSplit}
          </button>
        )}
      </div>

      {pieces.length > 0 && (
        <Field label={t.pieces} path={[...path, "chunks"]} hint={manual ? undefined : t.piecesDefault}>
          {(props) => (
            <ul
              id={props.id}
              data-path={props["data-path"]}
              aria-describedby={props["aria-describedby"]}
              className="flex flex-wrap items-center gap-1.5"
            >
              {pieces.map((piece, p) => (
                <Fragment key={`${p}-${piece}`}>
                  <li className="flex items-center gap-1 rounded-full bg-accent-muted py-1 pr-1 pl-3 text-sm text-accent">
                    {piece}
                    {manual && piece.includes(" ") && (
                      <button
                        type="button"
                        aria-label={t.splitPiece(piece)}
                        onClick={() =>
                          setPieces([
                            ...pieces.slice(0, p),
                            ...piece.split(/\s+/),
                            ...pieces.slice(p + 1),
                          ])
                        }
                        className="flex size-7 items-center justify-center rounded-full hover:bg-secondary"
                      >
                        <Scissors aria-hidden="true" className="size-3.5" />
                      </button>
                    )}
                  </li>
                  {manual && p < pieces.length - 1 && (
                    <li>
                      <button
                        type="button"
                        aria-label={t.joinPieces(piece, pieces[p + 1])}
                        onClick={() =>
                          setPieces([
                            ...pieces.slice(0, p),
                            `${piece} ${pieces[p + 1]}`,
                            ...pieces.slice(p + 2),
                          ])
                        }
                        className="flex size-7 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-fg"
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                      </button>
                    </li>
                  )}
                </Fragment>
              ))}
            </ul>
          )}
        </Field>
      )}

      <Field label={t.orderAlternatives} path={[...path, "alternatives"]} hint={t.orderAlternativesHint}>
        {(props) => (
          <textarea
            {...props}
            rows={2}
            defaultValue={alternatives.join("\n")}
            key={alternatives.join("\u0000")}
            onBlur={(e) => {
              const lines = e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
              const { alternatives: _old, ...rest } = item;
              void _old;
              onChange(lines.length > 0 ? { ...rest, alternatives: lines } : rest);
            }}
            className={`${props.className} py-2.5`}
          />
        )}
      </Field>

      <div className="flex flex-wrap gap-3">
        <TextField
          label={t.translation}
          path={[...path, "translation"]}
          value={asText(item.translation)}
          onChange={(translation) => onChange(withOptional(item, "translation", translation))}
        />
        <TextField
          label={t.hint}
          path={[...path, "hint"]}
          value={asText(item.hint)}
          onChange={(hint) => onChange(withOptional(item, "hint", hint))}
        />
      </div>

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
