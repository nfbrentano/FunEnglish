import type { ReactNode } from "react";
import { strings } from "@/lib/strings";

/** Temporary page body for routes whose spec isn't implemented yet. */
export function PagePlaceholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-xs tracking-[0.3em] text-muted uppercase">— {strings.comingSoon} —</p>
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{title}</h1>
      {children && <div className="max-w-xl text-fg-secondary">{children}</div>}
    </section>
  );
}
