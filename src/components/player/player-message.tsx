import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { strings } from "@/lib/strings";

/** Full-width message inside the player (errors, unsupported types, not found). */
export function PlayerMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <h2 className="font-display text-3xl font-medium">{title}</h2>
      {children && <p className="max-w-md text-fg-secondary">{children}</p>}
      <ButtonLink href="/activities" variant="secondary">
        {strings.player.backToActivities}
      </ButtonLink>
    </div>
  );
}
