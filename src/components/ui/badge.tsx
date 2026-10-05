import type { ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "outline" | string;
  className?: string;
}) {
  const isOutline = variant === "outline";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tracking-wider uppercase ${
        isOutline
          ? "border border-border-strong text-fg-secondary bg-transparent"
          : "border border-accent bg-elevated text-accent"
      } ${className}`}
    >
      {children}
    </span>
  );
}
