import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-muted px-2 py-0.5 text-[0.7rem] font-semibold tracking-wider text-accent uppercase">
      {children}
    </span>
  );
}
