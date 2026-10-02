// "Create with AI (copy prompt)" (spec: gestão completa, RF08): the generation guide
// (content/prompts/activities.md) turned into a ready-to-paste prompt, and the AI's answer back
// into an activity. No API: the admin pastes the prompt into any AI chat.
import { ACTIVITY_TYPES, type ActivityType } from "../activities/schema/activity";
import { validateActivity, type ValidationResult } from "../activities/validate";
import { fillMissingPrompts, fillPlannedSrcs } from "./plan-images";

export type Guide = {
  /** The "Prompt to use" text, with {PLACEHOLDERS}. */
  prompt: string;
  /** Per type: its rules paragraph and its JSON example (whole activity for quiz, else content). */
  types: Partial<Record<ActivityType, { rules: string; example: unknown }>>;
  /** level → notes, from the levels table. */
  levels: Record<string, { cefr: string; notes: string }>;
};

/** Reads the parts of the guide the prompt needs. */
export function parseGuide(markdown: string): Guide {
  const promptSection = /## Prompt to use\n([\s\S]*?)\n\n\|/.exec(markdown)?.[1] ?? "";
  const prompt = promptSection
    .split("\n")
    .map((line) => line.replace(/^> ?/, ""))
    .join("\n")
    .trim();

  const levels: Guide["levels"] = {};
  for (const [, level, cefr, notes] of markdown.matchAll(
    /^\|\s*(beginner|intermediate|advanced)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm,
  ))
    levels[level] = { cefr, notes };

  const types: Guide["types"] = {};
  for (const section of markdown.split(/\n### /).slice(1)) {
    const [heading, ...body] = section.split("\n");
    const type = heading.trim() as ActivityType;
    if (!ACTIVITY_TYPES.includes(type)) continue;
    const text = body.join("\n").split(/\n## /)[0];
    const json = /```json\n([\s\S]*?)\n```/.exec(text)?.[1];
    const rules = text.split("```")[0].replace(/\s+/g, " ").trim();
    if (json) types[type] = { rules, example: JSON.parse(json) };
  }
  return { prompt, types, levels };
}

export type PromptRequest = {
  type: ActivityType;
  category: string;
  level: string;
  topic: string;
  /** How many questions, cards, sentences… (optional). */
  count?: number;
};

/** Where each type keeps an item's picture, for the AI (spec: mais imagens, RF07). */
const PICTURE_RULE: Record<ActivityType, string> = {
  quiz: 'Give every question a picture: "media": {"kind": "image", "alt": "what the picture shows"}. When the answers are things you can draw, also give every option an "image": {"alt": "…"}.',
  "fill-blanks":
    'Give every item a picture: "media": {"kind": "image", "alt": "what the picture shows"}.',
  flashcards:
    'Give every card front a picture: "front": {"text": "…", "image": {"alt": "what the picture shows"}}.',
  "quiz-board":
    'Give clues a picture when it helps: "media": {"kind": "image", "alt": "what the picture shows"}.',
  "prompt-cards": 'Give every card a picture: "image": {"alt": "what the picture shows"}.',
};

const COUNT_NOUN: Record<ActivityType, string> = {
  quiz: "questions",
  flashcards: "cards",
  "fill-blanks": "sentences",
  "quiz-board": "clues per category",
  "prompt-cards": "cards",
};

/** The JSON template for any type: the quiz wrapper with this type's content. */
function templateFor(guide: Guide, request: PromptRequest): unknown {
  const quiz = guide.types.quiz?.example as Record<string, unknown> | undefined;
  const own = guide.types[request.type]?.example;
  return {
    ...quiz,
    slug: "short-lowercase-slug-1",
    title: "Short Title",
    category: request.category,
    type: request.type,
    levelMin: request.level,
    levelMax: request.level,
    status: "draft",
    content: request.type === "quiz" ? quiz?.content : own,
  };
}

export function buildAiPrompt(guide: Guide, request: PromptRequest): string {
  const level = guide.levels[request.level];
  const rules = [
    guide.types[request.type]?.rules ?? "",
    request.count ? `Write exactly ${request.count} ${COUNT_NOUN[request.type]}.` : "",
    `${PICTURE_RULE[request.type]} Leave out "src" (the site fills it in). Alt texts: one short, concrete sentence, no text in the picture.`,
    level ? `Level notes: ${level.notes}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const values: Record<string, string> = {
    LEVEL: request.level,
    CEFR: level?.cefr ?? "",
    TYPE: request.type,
    CATEGORY: request.category,
    TOPIC: request.topic.trim() || "a topic of your choice",
    TYPE_RULES: rules,
    TEMPLATE: JSON.stringify(templateFor(guide, request), null, 2),
  };
  return guide.prompt.replace(/\{([A-Z_]+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * The AI's answer → a draft activity, AI-generated and pending review (CA07). Accepts a ```json
 * fenced block or text around the JSON object.
 */
export function parseAiAnswer(
  answer: string,
  style = "",
): ValidationResult | { ok: false; errors: string[]; issues: [] } {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(answer)?.[1];
  const text = (fenced ?? answer).trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let raw: unknown;
  try {
    raw = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  } catch (error) {
    return { ok: false, errors: [`Not valid JSON: ${(error as Error).message}`], issues: [] };
  }
  // Pictures come without src (and maybe without prompt): plan them like "Plan images" does.
  const planned = fillMissingPrompts(fillPlannedSrcs(raw as Record<string, unknown>), style);
  const result = validateActivity({
    ...planned,
    status: "draft",
    origin: "ai",
    reviewStatus: "pending",
  });
  return result;
}
