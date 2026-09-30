import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border-subtle bg-elevated transition-colors duration-200 ${className}`}
      {...props}
    />
  );
}
