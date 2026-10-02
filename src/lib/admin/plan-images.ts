// Planning pictures for every item of an activity (spec: mais imagens nas atividades, RF06–RF08).
// A planned picture has src (where it will be uploaded), alt and prompt; until it's uploaded the
// player shows a fallback, never a broken image.
import type { ActivityType } from "../activities/schema/activity";

type Json = Record<string, unknown>;
export type ItemKind = "question" | "sentence" | "card" | "clue";

/** Targets of the first wave (D01): 80% of items for Beginner/Intermediate, 50% for Advanced. */
export const coverageTarget = (levelMin: string) => (levelMin === "advanced" ? 0.5 : 0.8);

const asArray = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const asText = (v: unknown) => (typeof v === "string" ? v : "");

/** The items of an activity, in order, with how each one holds its picture. */
export function itemsOf(type: ActivityType, content: unknown): { kind: ItemKind; item: Json }[] {
  const c = (content ?? {}) as Json;
  if (type === "quiz") return asArray(c.questions).map((item) => ({ kind: "question", item }));
  if (type === "fill-blanks") return asArray(c.items).map((item) => ({ kind: "sentence", item }));
  if (type === "flashcards" || type === "prompt-cards")
    return asArray(c.cards).map((item) => ({ kind: "card", item }));
  return asArray(c.categories).flatMap((cat) =>
    asArray(cat.clues).map((item) => ({ kind: "clue", item })),
  );
}

/** The item's picture, wherever its type keeps it. */
export function itemImage(type: ActivityType, item: Json): Json | null {
  if (type === "flashcards") return ((item.front as Json | undefined)?.image as Json) ?? null;
  if (type === "prompt-cards") return (item.image as Json) ?? null;
  const media = item.media as Json | undefined;
  return media?.kind === "image" ? media : null;
}

/** Items that can't take a picture: their one media slot is already audio, video or emoji. */
const mediaTaken = (type: ActivityType, item: Json) =>
  type !== "flashcards" && type !== "prompt-cards" && Boolean(item.media) && !itemImage(type, item);

export type Coverage = { items: number; planned: number; uploaded: number; target: number };

/** How many items have a picture planned, and how many are uploaded (in `existing`) (RF08). */
export function imageCoverage(
  activity: { type: ActivityType; content: unknown; levelMin: string },
  existing: ReadonlySet<string>,
): Coverage {
  const items = itemsOf(activity.type, activity.content);
  let planned = 0;
  let uploaded = 0;
  for (const { item } of items) {
    const image = itemImage(activity.type, item);
    if (!image) continue;
    planned++;
    const src = asText(image.src);
    if (src.startsWith("https://") || existing.has(src.split("?")[0])) uploaded++;
  }
  return { items: items.length, planned, uploaded, target: coverageTarget(activity.levelMin) };
}

/** "She [[goes]] to ___" → "She goes to …": readable text for an alt draft. */
function plainText(text: string, answer?: string) {
  return text
    .replace(/\[\[([^\]|]+)[^\]]*\]\]/g, "$1")
    .replace(/_{2,}/g, answer ?? "…")
    .replace(/^(Listen|Look|Read)[.!]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A first description of what the picture should show; the admin refines it. */
function draftAlt(type: ActivityType, item: Json): string {
  if (type === "quiz") {
    const correct = asArray(item.options).find((o) => o.correct);
    return plainText(asText(item.prompt), asText(correct?.text));
  }
  if (type === "fill-blanks") return plainText(asText(item.text));
  if (type === "flashcards") return asText((item.back as Json | undefined)?.text);
  if (type === "prompt-cards") return plainText(asText(item.prompt));
  return plainText(asText(item.answer) || asText(item.question));
}

export const promptFor = (subject: string, style: string) =>
  [subject.trim().replace(/\.$/, "") && `${subject.trim().replace(/\.$/, "")}.`, style]
    .filter(Boolean)
    .join(" ");

const image = (src: string, alt: string, style: string): Json => ({
  src,
  alt,
  source: "ai",
  prompt: promptFor(alt, style),
});

/**
 * Adds a planned picture to every item without one (CA06): question-1.webp, card-2.webp…
 * With `answers`, quiz options without a picture get question-N-option-M.webp too (RF03).
 * Returns the new content and how many pictures were planned.
 */
export function planImages(
  activity: { slug: string; type: ActivityType; content: unknown },
  { style, answers = false }: { style: string; answers?: boolean },
): { content: unknown; planned: number } {
  const { slug, type } = activity;
  const folder = `/images/activities/${slug}`;
  let planned = 0;
  let n = 0;
  const plan = (item: Json): Json => {
    n++;
    const kind =
      type === "quiz"
        ? "question"
        : type === "fill-blanks"
          ? "sentence"
          : type === "quiz-board"
            ? "clue"
            : "card";
    let next = item;
    if (!itemImage(type, item) && !mediaTaken(type, item)) {
      const alt = draftAlt(type, item) || `${kind} ${n}`;
      const picture = image(`${folder}/${kind}-${n}.webp`, alt, style);
      planned++;
      if (type === "flashcards")
        next = { ...item, front: { ...(item.front as Json), image: picture } };
      else if (type === "prompt-cards") next = { ...item, image: picture };
      else next = { ...item, media: { kind: "image", ...picture } };
    }
    if (type === "quiz" && answers) {
      next = {
        ...next,
        options: asArray(next.options).map((option, m) => {
          if (option.image) return option;
          planned++;
          return {
            ...option,
            image: image(
              `${folder}/question-${n}-option-${m + 1}.webp`,
              asText(option.text),
              style,
            ),
          };
        }),
      };
    }
    return next;
  };

  const c = (activity.content ?? {}) as Json;
  let content: Json;
  if (type === "quiz") content = { ...c, questions: asArray(c.questions).map(plan) };
  else if (type === "fill-blanks") content = { ...c, items: asArray(c.items).map(plan) };
  else if (type === "quiz-board")
    content = {
      ...c,
      categories: asArray(c.categories).map((cat) => ({
        ...cat,
        clues: asArray(cat.clues).map(plan),
      })),
    };
  else content = { ...c, cards: asArray(c.cards).map(plan) };
  return { content, planned };
}

/**
 * Pictures an AI described but without src (Create with AI, RF07): give them the planned paths,
 * so the answer validates and lands in "Missing images".
 */
export function fillPlannedSrcs(activity: Json): Json {
  const slug = asText(activity.slug) || "activity";
  const type = activity.type as ActivityType;
  const folder = `/images/activities/${slug}`;
  const withSrc = (picture: unknown, name: string): unknown => {
    if (!picture || typeof picture !== "object") return picture;
    const p = picture as Json;
    if (asText(p.src)) return p;
    return { source: "ai", ...p, src: `${folder}/${name}.webp` };
  };
  const thumbnail = withSrc(activity.thumbnail, "thumb");
  const kind =
    type === "quiz"
      ? "question"
      : type === "fill-blanks"
        ? "sentence"
        : type === "quiz-board"
          ? "clue"
          : "card";
  let n = 0;
  const fix = (item: Json): Json => {
    n++;
    const next: Json = { ...item };
    if (next.media && (next.media as Json).kind === "image")
      next.media = withSrc(next.media, `${kind}-${n}`);
    else if (
      next.media &&
      typeof next.media === "object" &&
      !(next.media as Json).kind &&
      (next.media as Json).alt
    )
      next.media = { kind: "image", ...(withSrc(next.media, `${kind}-${n}`) as Json) };
    if (next.image) next.image = withSrc(next.image, `${kind}-${n}`);
    if (next.front && (next.front as Json).image)
      next.front = {
        ...(next.front as Json),
        image: withSrc((next.front as Json).image, `${kind}-${n}`),
      };
    if (Array.isArray(next.options))
      next.options = asArray(next.options).map((o, m) =>
        o.image ? { ...o, image: withSrc(o.image, `question-${n}-option-${m + 1}`) } : o,
      );
    return next;
  };
  const c = (activity.content ?? {}) as Json;
  let content: Json = c;
  if (type === "quiz") content = { ...c, questions: asArray(c.questions).map(fix) };
  else if (type === "fill-blanks") content = { ...c, items: asArray(c.items).map(fix) };
  else if (type === "quiz-board")
    content = {
      ...c,
      categories: asArray(c.categories).map((cat) => ({
        ...cat,
        clues: asArray(cat.clues).map(fix),
      })),
    };
  else if (type === "flashcards" || type === "prompt-cards")
    content = { ...c, cards: asArray(c.cards).map(fix) };
  return { ...activity, thumbnail, content };
}

/** Pictures without a prompt get one from their alt and the house style. */
export function fillMissingPrompts<T>(value: T, style: string): T {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const object = Object.fromEntries(
      Object.entries(node as Json).map(([k, v]) => [k, walk(v)]),
    ) as Json;
    if (
      typeof object.src === "string" &&
      typeof object.alt === "string" &&
      !asText(object.prompt).trim()
    )
      object.prompt = promptFor(object.alt, style);
    return object;
  };
  return walk(value) as T;
}
