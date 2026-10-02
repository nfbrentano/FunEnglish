"use client";

import { strings } from "@/lib/strings";
import { asArray, asObject, asText, ListField, TextField, withOptional, type Json } from "./fields";
import type { Path } from "./form-context";
import { ItemList } from "./item-list";
import { ImageFields } from "./media-editor";

const t = strings.admin.form;

/** Discussion cards: prompt, image, "This or That", follow-ups, vocabulary, Writing mode (RF03). */
export function PromptCardsEditor({
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
    <div className="space-y-6">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={content.writing === true}
          onChange={(e) => onChange({ ...content, writing: e.target.checked })}
          className="size-4 accent-(--accent)"
        />
        {t.writingMode}
      </label>
      <ItemList
        label={t.cards}
        itemLabel={(i) => t.card(i + 1)}
        addLabel={t.addCard}
        items={asArray<Json>(content.cards)}
        onChange={(cards) => onChange({ ...content, cards })}
        create={() => ({ prompt: "" })}
        path={[...path, "cards"]}
        min={1}
        max={200}
        render={(card, i, update) => {
          const cardPath = [...path, "cards", i];
          const options = Array.isArray(card.options) ? (card.options as string[]) : null;
          const image = card.image ? asObject(card.image) : null;
          const drop = (key: string) => {
            const { [key]: _old, ...rest } = card;
            void _old;
            return rest;
          };
          return (
            <div className="space-y-4">
              <TextField
                label={t.cardPrompt}
                path={[...cardPath, "prompt"]}
                multiline
                value={asText(card.prompt)}
                onChange={(prompt) => update(withOptional(card, "prompt", prompt))}
              />
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options !== null}
                    onChange={(e) =>
                      update(e.target.checked ? { ...card, options: ["", ""] } : drop("options"))
                    }
                    className="size-4 accent-(--accent)"
                  />
                  {t.thisOrThat}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={image !== null}
                    onChange={(e) =>
                      update(
                        e.target.checked
                          ? { ...card, image: { src: "", alt: "", source: "ai" } }
                          : drop("image"),
                      )
                    }
                    className="size-4 accent-(--accent)"
                  />
                  {t.withImage}
                </label>
              </div>
              {options && (
                <div className="flex flex-wrap gap-3">
                  {[0, 1].map((o) => (
                    <TextField
                      key={o}
                      label={t.choice(o + 1)}
                      path={[...cardPath, "options", o]}
                      value={options[o]}
                      onChange={(text) =>
                        update({ ...card, options: options.map((x, j) => (j === o ? text : x)) })
                      }
                    />
                  ))}
                </div>
              )}
              {image && (
                <ImageFields
                  value={image}
                  path={[...cardPath, "image"]}
                  onChange={(next) => update({ ...card, image: next })}
                />
              )}
              <ItemList<string>
                compact
                label={t.followUps}
                itemLabel={(f) => t.followUp(f + 1, i + 1)}
                addLabel={t.addFollowUp}
                items={asArray<string>(card.followUps)}
                onChange={(followUps) =>
                  update(followUps.length ? { ...card, followUps } : drop("followUps"))
                }
                create={() => ""}
                path={[...cardPath, "followUps"]}
                render={(text, f, set) => (
                  <TextField
                    hideLabel
                    label={t.followUp(f + 1, i + 1)}
                    path={[...cardPath, "followUps", f]}
                    value={text}
                    onChange={set}
                  />
                )}
              />
              <ListField
                label={t.vocabulary}
                path={[...cardPath, "vocabulary"]}
                hint={t.commaHint}
                value={asArray<string>(card.vocabulary)}
                onChange={(vocabulary) =>
                  update(vocabulary.length ? { ...card, vocabulary } : drop("vocabulary"))
                }
              />
            </div>
          );
        }}
      />
    </div>
  );
}
