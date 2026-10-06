"use client";

import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  FilePlus2,
  LayoutTemplate,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type CategoryId } from "@/lib/activities/categories";
import { LEVELS, type Level } from "@/lib/activities/levels";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activities/schema/activity";
import { validateActivity, type ValidationResult } from "@/lib/activities/validate";
import { isSlugTaken, saveActivity } from "@/lib/admin/activities-admin";
import { buildAiPrompt, parseAiAnswer, type Guide } from "@/lib/admin/ai-prompt";
import { useAuth } from "@/lib/auth/use-auth";
import { PLUGINS } from "@/lib/player/registry";
import { strings } from "@/lib/strings";
import { useQueryParam } from "@/lib/use-query-param";
import { editHref } from "./admin-list";
import { inputClasses } from "./content/fields";

const t = strings.admin.create;

/** /admin/edit for a new activity, prefilled with the choices made here. */
export function newActivityHref(
  start: "blank" | "example",
  type: string,
  category: string,
  level: string,
) {
  const params = new URLSearchParams({ start, type, category, level });
  return `/admin/edit?${params}`;
}

/** First free slug: some-or-any, some-or-any-2, some-or-any-3… */
async function freeSlug(slug: string) {
  let candidate = slug;
  for (let n = 2; await isSlugTaken(candidate, null); n++) candidate = `${slug}-${n}`;
  return candidate;
}

function Choice({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-elevated p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
          {icon}
        </span>
        <div className="space-y-1">
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="text-sm text-fg-secondary">{text}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Ways to start a new activity (spec: gestão completa, RF08). */
export function NewActivity({ guide, imageStyle = "" }: { guide: Guide; imageStyle?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const ids = useId();
  // Prefilled from the coverage page (CA14): /admin/new?category=listening&level=advanced&mode=ai
  const qType = useQueryParam("type");
  const qCategory = useQueryParam("category");
  const qLevel = useQueryParam("level");
  const mode = useQueryParam("mode");
  const [type, setType] = useState<ActivityType>("quiz");
  const [category, setCategory] = useState<CategoryId>("grammar");
  const [level, setLevel] = useState<Level>("beginner");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<number | "">("");
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState("");
  const [pasted, setPasted] = useState("");
  const [errors, setErrors] = useState<{ ai?: string[]; json?: string[] }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Query params arrive after hydration (static export): apply them once.
    /* eslint-disable react-hooks/set-state-in-effect -- syncing from the URL once */
    if (qType && (ACTIVITY_TYPES as readonly string[]).includes(qType))
      setType(qType as ActivityType);
    if (qCategory && CATEGORIES.some((c) => c.id === qCategory))
      setCategory(qCategory as CategoryId);
    if (qLevel && (LEVELS as readonly string[]).includes(qLevel)) setLevel(qLevel as Level);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [qType, qCategory, qLevel]);

  useEffect(() => {
    if (mode === "ai") document.getElementById(`${ids}-topic`)?.focus();
  }, [mode, ids]);

  const prompt = buildAiPrompt(guide, {
    type,
    category,
    level,
    topic,
    count: count === "" ? undefined : count,
  });
  const author = user
    ? { uid: user.uid, name: user.displayName ?? user.email ?? user.uid }
    : undefined;

  async function createDraft(result: ValidationResult, key: "ai" | "json") {
    if (!result.ok) {
      setErrors({ [key]: result.errors });
      return;
    }
    setBusy(true);
    try {
      const activity = result.activity;
      const { id } = await saveActivity(
        null,
        {
          ...activity,
          slug: await freeSlug(activity.slug),
          status: "draft",
          origin: activity.origin ?? (key === "ai" ? "ai" : "human"),
          reviewStatus:
            activity.reviewStatus ??
            ((activity.origin ?? (key === "ai" ? "ai" : "human")) === "ai"
              ? "pending"
              : "reviewed"),
        },
        { author, summary: key === "ai" ? "Created with AI" : "Created from JSON" },
      );
      router.push(editHref(id));
    } catch (error) {
      console.warn("Could not create the draft", error);
      setErrors({ [key]: [strings.admin.saveError] });
    } finally {
      setBusy(false);
    }
  }

  const select = `${inputClasses()} w-auto min-w-44`;

  return (
    <div className="mx-auto w-full max-w-300 space-y-8 px-4 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {strings.admin.back}
      </Link>
      <h1 className="font-display text-5xl font-medium">{strings.admin.newTitle}</h1>

      <fieldset className="flex flex-wrap gap-4 rounded-2xl border border-border-subtle bg-secondary p-4">
        <legend className="sr-only">{t.basics}</legend>
        {(
          [
            [
              "type",
              strings.admin.fields.type,
              type,
              (v: string) => setType(v as ActivityType),
              ACTIVITY_TYPES.map((x) => [x, PLUGINS[x].label]),
            ],
            [
              "category",
              strings.admin.fields.category,
              category,
              (v: string) => setCategory(v as CategoryId),
              CATEGORIES.map((c) => [c.id, c.name]),
            ],
            [
              "level",
              t.level,
              level,
              (v: string) => setLevel(v as Level),
              LEVELS.map((l) => [l, strings.catalog.levels[l]]),
            ],
          ] as const
        ).map(([name, label, value, onChange, options]) => (
          <div key={name} className="space-y-1.5">
            <label htmlFor={`${ids}-${name}`} className="text-sm font-medium">
              {label}
            </label>
            <select
              id={`${ids}-${name}`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={select}
            >
              {options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <Choice
          icon={<FilePlus2 aria-hidden="true" className="size-5" />}
          title={t.blankTitle}
          text={t.blankText}
        >
          <Button
            className="self-start"
            onClick={() => router.push(newActivityHref("blank", type, category, level))}
          >
            {t.blankAction}
          </Button>
        </Choice>
        <Choice
          icon={<LayoutTemplate aria-hidden="true" className="size-5" />}
          title={t.exampleTitle}
          text={t.exampleText}
        >
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => router.push(newActivityHref("example", type, category, level))}
          >
            {t.exampleAction}
          </Button>
        </Choice>
      </div>

      <Choice
        icon={<Sparkles aria-hidden="true" className="size-5" />}
        title={t.aiTitle}
        text={t.aiText}
      >
        <div className="flex flex-wrap gap-3">
          <div className="min-w-64 flex-1 space-y-1.5">
            <label htmlFor={`${ids}-topic`} className="text-sm font-medium">
              {t.topic}
            </label>
            <input
              id={`${ids}-topic`}
              value={topic}
              placeholder={t.topicPlaceholder}
              onChange={(e) => setTopic(e.target.value)}
              className={inputClasses()}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-count`} className="text-sm font-medium">
              {t.count}
            </label>
            <input
              id={`${ids}-count`}
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) =>
                setCount(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))
              }
              className={`${inputClasses()} w-28`}
            />
          </div>
        </div>
        <ol className="list-decimal space-y-4 pl-5 text-sm text-fg-secondary">
          <li className="space-y-2">
            <p>{t.step1}</p>
            <label htmlFor={`${ids}-prompt`} className="sr-only">
              {t.prompt}
            </label>
            <textarea
              id={`${ids}-prompt`}
              readOnly
              rows={6}
              value={prompt}
              onFocus={(e) => e.target.select()}
              className={`${inputClasses()} py-3 font-mono text-xs`}
            />
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  const area = document.getElementById(
                    `${ids}-prompt`,
                  ) as HTMLTextAreaElement | null;
                  area?.focus();
                  area?.select();
                }
              }}
            >
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <ClipboardCopy aria-hidden="true" className="size-4" />
              )}
              {copied ? strings.share.copied : t.copyPrompt}
            </Button>
          </li>
          <li className="space-y-2">
            <label htmlFor={`${ids}-answer`} className="block">
              {t.step2}
            </label>
            <textarea
              id={`${ids}-answer`}
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={`${inputClasses()} py-3 font-mono text-xs`}
            />
            <ErrorList errors={errors.ai} />
            <Button
              disabled={busy || !answer.trim()}
              onClick={() => createDraft(parseAiAnswer(answer, imageStyle), "ai")}
            >
              {t.createDraft}
            </Button>
          </li>
        </ol>
      </Choice>

      <Choice
        icon={<Upload aria-hidden="true" className="size-5" />}
        title={t.jsonTitle}
        text={t.jsonText}
      >
        <label htmlFor={`${ids}-json`} className="sr-only">
          {t.jsonTitle}
        </label>
        <textarea
          id={`${ids}-json`}
          rows={6}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          className={`${inputClasses()} py-3 font-mono text-xs`}
        />
        <ErrorList errors={errors.json} />
        <Button
          variant="secondary"
          className="self-start"
          disabled={busy || !pasted.trim()}
          onClick={() => {
            let raw: Record<string, unknown>;
            try {
              raw = JSON.parse(pasted) as Record<string, unknown>;
            } catch (error) {
              setErrors({ json: [`Not valid JSON: ${(error as Error).message}`] });
              return;
            }
            const {
              id: _i,
              createdAt: _c,
              updatedAt: _u,
              searchTokens: _s,
              editedInPanelAt: _e,
              ...rest
            } = raw;
            void [_i, _c, _u, _s, _e];
            void createDraft(validateActivity({ ...rest, status: "draft" }), "json");
          }}
        >
          {t.createDraft}
        </Button>
      </Choice>
    </div>
  );
}

function ErrorList({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div role="alert" className="rounded-xl border border-error/40 p-3 text-sm">
      <p className="mb-1 font-medium text-error">{t.invalid}</p>
      <ul className="list-disc space-y-0.5 pl-5 font-mono text-xs text-fg-secondary">
        {errors.slice(0, 12).map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
