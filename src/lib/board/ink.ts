/**
 * Board surfaces and semantic ink colors (SDD/2026-10-06_redesign-ux-ui-lousa.md, RF04, RF05).
 *
 * Items store an ink key ("ink", "red"…) instead of a hex value, so the same drawing reads well on a
 * light or a dark surface. This module is the single place that holds board hex values: canvas
 * rendering and PNG export need them outside of CSS, and the components read them from here.
 */

export const BOARD_INKS = ["ink", "red", "blue", "green", "amber", "violet"] as const;
export type BoardInk = (typeof BOARD_INKS)[number];

export type BoardSurface = "light" | "dark";
export type BoardSurfacePreference = "auto" | BoardSurface;
export const BOARD_SURFACE_PREFERENCES: BoardSurfacePreference[] = ["auto", "light", "dark"];

export interface BoardSurfacePalette {
  /** Page fill. */
  background: string;
  /** Grid lines (low contrast, never competing with ink). */
  grid: string;
  /** Ruled lines. */
  rule: string;
  /** Ink colors tuned for this surface (each ≥ 3:1 against `background`). */
  ink: Record<BoardInk, string>;
}

export const BOARD_SURFACES: Record<BoardSurface, BoardSurfacePalette> = {
  light: {
    background: "#fbfbfa",
    grid: "#e7e7e3",
    rule: "#d8d8d2",
    ink: {
      ink: "#1c1c1e",
      red: "#d0312d",
      blue: "#1f63d6",
      green: "#18794e",
      amber: "#a35c00",
      violet: "#7a3fd8",
    },
  },
  dark: {
    background: "#17181b",
    grid: "#24262a",
    rule: "#2e3035",
    ink: {
      ink: "#f2f2ef",
      red: "#ff7a72",
      blue: "#77aaff",
      green: "#5fd38d",
      amber: "#f5c04e",
      violet: "#c1a0ff",
    },
  },
};

/** Laser pointer trail (RF05): a glow and a lighter core, readable on both surfaces. */
export const BOARD_LASER = { glow: "#ff3b30", core: "#ffd6d3" } as const;

/** Colors saved before ink keys existed (old board palette and the live board's CSS names). */
const LEGACY_INKS: Record<string, BoardInk> = {
  "#1e293b": "ink",
  "#000": "ink",
  "#000000": "ink",
  black: "ink",
  "#ef4444": "red",
  red: "red",
  "#3b82f6": "blue",
  blue: "blue",
  "#10b981": "green",
  green: "green",
  "#f59e0b": "amber",
  "#8b5cf6": "violet",
};

export function isBoardInk(value: unknown): value is BoardInk {
  return BOARD_INKS.includes(value as BoardInk);
}

/** Maps a stored color (ink key or legacy hex/name) to an ink key, or null for unknown colors. */
export function toBoardInk(color: string | undefined): BoardInk | null {
  if (!color) return "ink";
  if (isBoardInk(color)) return color;
  return LEGACY_INKS[color.trim().toLowerCase()] ?? null;
}

/** Hex to paint for a stored color on the given surface. Unknown colors are drawn as they are. */
export function resolveInk(color: string | undefined, surface: BoardSurface): string {
  const ink = toBoardInk(color);
  return ink ? BOARD_SURFACES[surface].ink[ink] : (color as string);
}

/** "auto" follows the site theme: dark → dark surface; light and sepia → light surface (D05). */
export function resolveBoardSurface(
  preference: BoardSurfacePreference,
  siteTheme: string | undefined,
): BoardSurface {
  if (preference !== "auto") return preference;
  return siteTheme === "dark" ? "dark" : "light";
}

/** WCAG relative luminance contrast between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
