import type { ReactNode } from "react";
import { formatUpdated } from "@/lib/pages/content";

/** Title, "Last updated" and Markdown-rendered body (our own files in content/pages). */
export function ProsePage({
  title,
  updated,
  html,
  children,
}: {
  title: string;
  updated: string;
  html?: string;
  children?: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14">
      <header className="mb-10 space-y-3 border-b border-border-subtle pb-8">
        <h1 className="font-display text-5xl font-medium text-fg sm:text-6xl">{title}</h1>
        <p className="text-sm text-muted">
          Last updated <time dateTime={updated}>{formatUpdated(updated)}</time>
        </p>
      </header>
      {html && <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />}
      {children}
    </article>
  );
}
