import { BOARD_FONT_SCALE } from "./types";

/**
 * Steps font size up or down along the discrete font scale (RF06, CT07).
 * If `current` is outside the scale, jumps to the nearest valid step in the specified direction.
 */
export function stepFontSize(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    const next = BOARD_FONT_SCALE.find((s) => s > current);
    return next ?? BOARD_FONT_SCALE[BOARD_FONT_SCALE.length - 1];
  } else {
    for (let i = BOARD_FONT_SCALE.length - 1; i >= 0; i--) {
      if (BOARD_FONT_SCALE[i] < current) {
        return BOARD_FONT_SCALE[i];
      }
    }
    return BOARD_FONT_SCALE[0];
  }
}
