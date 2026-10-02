"use client";

import { strings } from "@/lib/strings";
import { asArray, asObject, asText, TextField, withOptional, type Json } from "./fields";
import type { Path } from "./form-context";
import { ItemList } from "./item-list";
import { ImageFields } from "./media-editor";

const t = strings.admin.form;

/** Flashcards: front (text and/or image) and back (word, definition, example) (RF03). */
export function FlashcardsEditor({
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
      label={t.cards}
      itemLabel={(i) => t.card(i + 1)}
      addLabel={t.addCard}
      items={asArray<Json>(content.cards)}
      onChange={(cards) => onChange({ ...content, cards })}
      create={() => ({ front: { text: "" }, back: { text: "" } })}
      path={[...path, "cards"]}
      min={1}
      max={200}
      render={(card, i, update) => {
        const cardPath = [...path, "cards", i];
        const front = asObject(card.front);
        const back = asObject(card.back);
        const image = front.image ? asObject(front.image) : null;
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium text-fg-secondary">{t.front}</legend>
              <TextField
                label={t.frontText}
                path={[...cardPath, "front", "text"]}
                hint={t.frontHint}
                value={asText(front.text)}
                onChange={(text) => update({ ...card, front: withOptional(front, "text", text) })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={image !== null}
                  onChange={(e) => {
                    const { image: _old, ...rest } = front;
                    void _old;
                    update({
                      ...card,
                      front: e.target.checked
                        ? { ...rest, image: { src: "", alt: "", source: "ai" } }
                        : rest,
                    });
                  }}
                  className="size-4 accent-(--accent)"
                />
                {t.withImage}
              </label>
              {image && (
                <ImageFields
                  value={image}
                  path={[...cardPath, "front", "image"]}
                  onChange={(next) => update({ ...card, front: { ...front, image: next } })}
                />
              )}
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium text-fg-secondary">{t.back}</legend>
              <TextField
                label={t.word}
                path={[...cardPath, "back", "text"]}
                value={asText(back.text)}
                onChange={(text) => update({ ...card, back: { ...back, text } })}
              />
              <TextField
                label={t.definition}
                path={[...cardPath, "back", "definition"]}
                value={asText(back.definition)}
                onChange={(v) => update({ ...card, back: withOptional(back, "definition", v) })}
              />
              <TextField
                label={t.example}
                path={[...cardPath, "back", "example"]}
                value={asText(back.example)}
                onChange={(v) => update({ ...card, back: withOptional(back, "example", v) })}
              />
              <TextField
                label={t.speak}
                path={[...cardPath, "speak"]}
                hint={t.speakHint}
                value={asText(card.speak)}
                onChange={(v) => update(withOptional(card, "speak", v))}
              />
            </fieldset>
          </div>
        );
      }}
    />
  );
}
