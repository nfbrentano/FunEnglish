"use client";

import { BookOpen, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import { strings } from "@/lib/strings";
import {
  readThemePreference,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: strings.theme.system, Icon: Monitor },
  { value: "dark", label: strings.theme.dark, Icon: Moon },
  { value: "light", label: strings.theme.light, Icon: Sun },
  { value: "sepia", label: strings.theme.sepia, Icon: BookOpen },
];

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeToTheme, readThemePreference, () => "system");
}

/** Radio group of themes. `compact` shows icons only (header); otherwise icons + labels (settings). */
export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const preference = useThemePreference();
  const name = useId();

  return (
    <fieldset
      className={
        compact
          ? "flex rounded-full border border-border-subtle p-0.5"
          : "grid grid-cols-2 gap-2 sm:grid-cols-4"
      }
    >
      <legend className="sr-only">{strings.theme.label}</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={value}
          title={compact ? label : undefined}
          className={[
            "flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm transition-colors duration-200",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
            compact ? "size-8" : "min-h-11 border border-border-subtle px-3",
            preference === value
              ? "bg-accent-muted text-accent"
              : "text-fg-secondary hover:text-fg",
          ].join(" ")}
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={preference === value}
            onChange={() => setThemePreference(value)}
            className="sr-only"
          />
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          <span className={compact ? "sr-only" : ""}>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
