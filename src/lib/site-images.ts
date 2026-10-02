// Images of the site itself (not of an activity): category illustrations, used when an activity
// image is missing, and the results illustrations (spec: mais imagens nas atividades, RF04, RF09).
import { CATEGORIES } from "./activities/categories";

export type SiteImage = { src: string; alt: string; subject: string };

const CATEGORY_SUBJECTS: Record<string, string> = {
  fun: "Party confetti, a game die and a star, playful and cheerful",
  grammar: "An open notebook with colorful sentence building blocks",
  listening: "Big headphones with soft sound waves",
  pictures: "A stack of illustrated picture cards and a magnifying glass",
  reading: "An open book with a cup of tea beside it",
  speaking: "Two speech bubbles in conversation",
  videos: "A film clapperboard and a play button",
  vocabulary: "Alphabet tiles arranged like a crossword",
  writing: "A fountain pen writing on a sheet of paper",
};

export const categoryImage = (category: string) => `/images/categories/${category}.webp`;

export const RESULT_IMAGES = {
  great: "/images/results/great.webp",
  good: "/images/results/good.webp",
  practice: "/images/results/practice.webp",
  done: "/images/results/done.webp",
} as const;
export type ResultBand = keyof typeof RESULT_IMAGES;

/** ≥ 80% great, ≥ 50% good, else practice; activities without a score are "done" (RF04). */
export function resultBand(correct: number, total: number, scored: boolean): ResultBand {
  if (!scored || total === 0) return "done";
  const ratio = correct / total;
  return ratio >= 0.8 ? "great" : ratio >= 0.5 ? "good" : "practice";
}

const RESULT_SUBJECTS: Record<ResultBand, string> = {
  great: "A golden trophy with confetti and stars, celebrating",
  good: "A big thumbs-up with a few sparkles",
  practice: "A small plant growing in a pot, with a watering can, meaning keep practicing",
  done: "A raised hand high-five with a small star, meaning good job",
};

/** Every site image, for "Missing images" (decorative: alt stays empty on the page). */
export const SITE_IMAGES: SiteImage[] = [
  ...CATEGORIES.map((c) => ({
    src: categoryImage(c.id),
    alt: `${c.name} illustration`,
    subject: CATEGORY_SUBJECTS[c.id] ?? c.name,
  })),
  ...(Object.keys(RESULT_IMAGES) as ResultBand[]).map((band) => ({
    src: RESULT_IMAGES[band],
    alt: `Results: ${band}`,
    subject: RESULT_SUBJECTS[band],
  })),
];

/** "/images/x.webp?v=ab12" → "/images/x.webp": the file, whatever its version (RNF03). */
export const stripVersion = (src: string) => src.split("?")[0];

/** Images in public/images when this build ran (set by next.config.ts). */
const BUILT = new Set((process.env.NEXT_PUBLIC_IMAGES ?? "").split(",").filter(Boolean));

/**
 * Whether a picture can be shown: an https:// URL (can't be checked), or a /images file that was
 * in this build. A planned picture not uploaded yet answers false: show its fallback, no request.
 */
export function imageExists(src: string): boolean {
  if (!src.startsWith("/images/")) return true;
  return BUILT.has(stripVersion(src));
}
export const siteImageExists = imageExists;
