import type { ReactNode } from "react";

/** Solid background, so the text keeps its contrast even on top of images and tints. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-accent bg-elevated px-2 py-0.5 text-[0.7rem] font-semibold tracking-wider text-accent uppercase">
      {children}
    </span>
  );
}
