"use client";

import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  forgetToken,
  GitHubError,
  NEW_TOKEN_URL,
  readToken,
  saveToken,
  verifyToken,
} from "@/lib/admin/github";
import { strings } from "@/lib/strings";
import { inputClasses } from "./content/fields";

const t = strings.admin.settings;

/** GitHub connection for image uploads (spec: imagens pelo painel, RF08, CA06, CA07). */
export function SettingsView() {
  const [login, setLogin] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A saved token: check it's still valid (it may have expired).
  useEffect(() => {
    const saved = readToken();
    if (!saved) return;
    verifyToken(saved)
      .then(setLogin)
      .catch(() => setLogin(null));
  }, []);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const who = await verifyToken(token.trim());
      saveToken(token.trim());
      setLogin(who);
      setToken("");
    } catch (e) {
      // Nothing is saved when the check fails.
      setError(e instanceof GitHubError ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {strings.admin.back}
      </Link>
      <h1 className="font-display text-5xl font-medium">{t.title}</h1>

      <section
        aria-labelledby="github-title"
        className="space-y-4 rounded-2xl border border-border-subtle bg-elevated p-6"
      >
        <h2 id="github-title" className="font-display text-3xl">
          {t.githubTitle}
        </h2>
        <p className="text-fg-secondary">{t.githubText}</p>

        {login ? (
          <div className="space-y-3">
            <p role="status" className="flex items-center gap-2 text-success">
              <CheckCircle2 aria-hidden="true" className="size-5" />
              {t.connected(login)}
            </p>
            <p className="text-sm text-fg-secondary">{t.connectedHere}</p>
            <Button
              variant="secondary"
              onClick={() => {
                forgetToken();
                setLogin(null);
              }}
            >
              {t.disconnect}
            </Button>
          </div>
        ) : (
          <>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-fg-secondary">
              {t.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a
              href={NEW_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-4"
            >
              {t.openGitHub}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
            <form onSubmit={connect} className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1 space-y-1.5">
                <label htmlFor="github-token" className="text-sm font-medium">
                  {t.token}
                </label>
                <input
                  id="github-token"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={token}
                  placeholder="github_pat_…"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "github-error" : undefined}
                  onChange={(e) => setToken(e.target.value)}
                  className={inputClasses(error ?? undefined)}
                />
              </div>
              <Button type="submit" disabled={checking || !token.trim()}>
                {checking ? t.checking : t.connectAction}
              </Button>
            </form>
            {error && (
              <p id="github-error" role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
