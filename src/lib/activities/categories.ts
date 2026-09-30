export type Category = {
  id: string;
  name: string;
  subtitle: string;
  /** Lucide icon name. */
  icon: string;
  /** CSS color token defined in src/styles/theme.css. */
  color: string;
};

// Display order of the catalog carousels and the category bar.
export const CATEGORIES = [
  {
    id: "fun",
    name: "Fun",
    subtitle: "Games & activities",
    icon: "party-popper",
    color: "var(--cat-fun)",
  },
  {
    id: "grammar",
    name: "Grammar",
    subtitle: "Grammar practice",
    icon: "book-open",
    color: "var(--cat-grammar)",
  },
  {
    id: "listening",
    name: "Listening",
    subtitle: "Audio activities",
    icon: "headphones",
    color: "var(--cat-listening)",
  },
  {
    id: "pictures",
    name: "Pictures",
    subtitle: "Visual learning",
    icon: "image",
    color: "var(--cat-pictures)",
  },
  {
    id: "reading",
    name: "Reading",
    subtitle: "Reading comprehension",
    icon: "book-text",
    color: "var(--cat-reading)",
  },
  {
    id: "speaking",
    name: "Speaking",
    subtitle: "Conversation practice",
    icon: "message-circle",
    color: "var(--cat-speaking)",
  },
  {
    id: "videos",
    name: "Videos",
    subtitle: "Video lessons",
    icon: "clapperboard",
    color: "var(--cat-videos)",
  },
  {
    id: "vocabulary",
    name: "Vocabulary",
    subtitle: "Word building",
    icon: "whole-word",
    color: "var(--cat-vocabulary)",
  },
  {
    id: "writing",
    name: "Writing",
    subtitle: "Writing skills",
    icon: "pen-line",
    color: "var(--cat-writing)",
  },
] as const satisfies readonly Category[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
