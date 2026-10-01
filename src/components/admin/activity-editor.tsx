"use client";

import { ArrowLeft, CheckCircle2, Copy, Download, Eye, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ActivityPlayer } from "@/components/player/activity-player";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/activities/categories";
import { LEVELS } from "@/lib/activities/levels";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activities/schema/activity";
import { validateActivity } from "@/lib/activities/validate";
import {
  deleteActivity,
  getActivity,
  isSlugTaken,
  listActivities,
  saveActivity,
  type AdminActivity,
} from "@/lib/admin/activities-admin";
import { collectTextFields, describePath, setAtPath, slugify } from "@/lib/admin/content-fields";
import { needsReview } from "@/lib/admin/filter";
import { CONTENT_TEMPLATES } from "@/lib/admin/templates";
import { useAuth } from "@/lib/auth/use-auth";
import type { PlayableActivity } from "@/lib/player/load-activity";
import { PLUGINS } from "@/lib/player/registry";
import { strings } from "@/lib/strings";
import { useQueryParam } from "@/lib/use-query-param";
import { editHref } from "./admin-list";

type Draft = Omit<
  AdminActivity,
  "id" | "createdAt" | "updatedAt" | "tags" | "content" | "schemaVersion"
> & {
  tags: string;
  content: unknown;
};

const t = strings.admin;
const input =
  "min-h-11 w-full rounded-xl border border-border-strong bg-primary px-4 text-fg focus:border-accent";

function newDraft(): Draft {
  return {
    title: "",
    slug: "",
    description: "",
    category: "grammar",
    levelMin: "beginner",
    levelMax: "intermediate",
    type: "quiz",
    tags: "",
    status: "draft",
    featured: false,
    thumbnail: { src: "", alt: "", source: "ai" },
    origin: "human",
    reviewStatus: "reviewed",
    content: CONTENT_TEMPLATES.quiz,
  };
}

function toDraft(a: AdminActivity): Draft {
  const { id: _id, createdAt: _c, updatedAt: _u, schemaVersion: _v, tags, ...rest } = a;
  void [_id, _c, _u, _v];
  return { ...rest, tags: tags.join(", ") };
}

function toCandidate(draft: Draft) {
  return {
    ...draft,
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: (id: string) => React.ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Create or edit one activity (spec: painel admin). Reads ?id= and ?review=1 from the URL. */
export function ActivityEditor() {
  const id = useQueryParam("id");
  const reviewMode = useQueryParam("review") === "1";
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [loadedId, setLoadedId] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(newDraft().content, null, 2));
  const [jsonError, setJsonError] = useState(false);
  const [tab, setTab] = useState<"texts" | "json">("texts");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [deleteText, setDeleteText] = useState("");
  const [queue, setQueue] = useState<string[] | null>(null);

  // Load the activity (or start a new one) whenever ?id changes.
  useEffect(() => {
    let active = true;
    const load = id ? getActivity(id) : Promise.resolve(null);
    load
      .then((activity) => {
        if (!active) return;
        const next = activity ? toDraft(activity) : newDraft();
        setDraft(next);
        setJsonText(JSON.stringify(next.content, null, 2));
        setJsonError(false);
        setSlugEdited(Boolean(activity));
        setLoadedId(activity ? activity.id : null);
      })
      .catch((error: unknown) => {
        console.warn("Could not load activity", error);
        if (active) setLoadedId(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Review queue for "Save & next".
  useEffect(() => {
    if (!reviewMode) return;
    listActivities()
      .then((all) => setQueue(all.filter(needsReview).map((a) => a.id)))
      .catch(() => setQueue([]));
  }, [reviewMode]);

  // Unique slug.
  useEffect(() => {
    if (!draft.slug) return;
    let active = true;
    const timer = setTimeout(() => {
      isSlugTaken(draft.slug, loadedId ?? null)
        .then((taken) => active && setSlugTaken(taken))
        .catch(() => {});
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft.slug, loadedId]);

  const candidate = useMemo(() => toCandidate(draft), [draft]);
  const validation = useMemo(() => validateActivity(candidate), [candidate]);
  const errors = [
    ...(validation.ok ? [] : validation.errors),
    ...(slugTaken ? [`slug: ${t.slugTaken}`] : []),
  ];
  const valid = errors.length === 0 && !jsonError;

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setContent = (content: unknown) => {
    set({ content });
    setJsonText(JSON.stringify(content, null, 2));
    setJsonError(false);
  };

  async function save(patch: Partial<Draft>, message: string, next?: () => void) {
    const toSave = toCandidate({ ...draft, ...patch });
    if (slugTaken || jsonError) return;
    if (toSave.status === "published" && (!valid || !validateActivity(toSave).ok)) return;
    setBusy(true);
    try {
      if (await isSlugTaken(toSave.slug, loadedId ?? null)) {
        setSlugTaken(true);
        return;
      }
      const savedId = await saveActivity(
        loadedId ?? null,
        toSave as Parameters<typeof saveActivity>[1],
      );
      setDraft((d) => ({ ...d, ...patch }));
      toast(message);
      if (next) next();
      else if (savedId !== loadedId) router.replace(editHref(savedId));
    } catch (error) {
      console.warn("Save failed", error);
      toast(t.saveError);
    } finally {
      setBusy(false);
    }
  }

  const reviewPatch = (): Partial<Draft> => ({
    reviewStatus: "reviewed",
    reviewedAt: new Date().toISOString(),
    reviewedBy: user?.uid,
  });

  async function saveAndNext() {
    const nextId = queue?.find((q) => q !== loadedId);
    await save(reviewPatch(), t.saved, () =>
      router.push(nextId ? editHref(nextId, true) : "/admin"),
    );
  }

  async function duplicate() {
    const base = slugify(`${draft.slug || draft.title}-${t.copy}`);
    let slug = base;
    for (let n = 2; await isSlugTaken(slug, null); n++) slug = `${base}-${n}`;
    setBusy(true);
    try {
      const copyId = await saveActivity(
        null,
        toCandidate({
          ...draft,
          title: `${draft.title} (${t.copy})`,
          slug,
          status: "draft",
        }) as Parameters<typeof saveActivity>[1],
      );
      router.push(editHref(copyId));
    } catch {
      toast(t.saveError);
    } finally {
      setBusy(false);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(candidate, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `${draft.slug || "activity"}.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loadedId === undefined) {
    return (
      <div
        role="status"
        aria-label={t.loading}
        className="mx-auto w-full max-w-[1200px] px-4 py-12"
      >
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const fields = collectTextFields(draft.content);
  const isNewActivity = loadedId === null;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        {needsReview(draft) && <p className="text-sm text-accent">{t.pendingReview}</p>}
      </div>
      <h1 className="font-display text-5xl font-medium">
        {isNewActivity ? t.newTitle : draft.title || t.editTitle}
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section
            aria-label={t.editTitle}
            className="grid gap-4 rounded-2xl border border-border-subtle bg-elevated p-5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Field label={t.fields.title}>
                {(fid) => (
                  <input
                    id={fid}
                    value={draft.title}
                    onChange={(e) =>
                      set({
                        title: e.target.value,
                        ...(slugEdited ? {} : { slug: slugify(e.target.value) }),
                      })
                    }
                    className={input}
                  />
                )}
              </Field>
            </div>
            <Field label={t.fields.slug}>
              {(fid) => (
                <input
                  id={fid}
                  value={draft.slug}
                  aria-invalid={slugTaken || undefined}
                  onChange={(e) => {
                    setSlugEdited(true);
                    set({ slug: e.target.value });
                  }}
                  className={`${input} ${slugTaken ? "border-error" : ""}`}
                />
              )}
            </Field>
            <Field label={t.fields.type}>
              {(fid) => (
                <select
                  id={fid}
                  value={draft.type}
                  onChange={(e) => set({ type: e.target.value as ActivityType })}
                  className={input}
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PLUGINS[type].label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="sm:col-span-2">
              <Field label={t.fields.description}>
                {(fid) => (
                  <textarea
                    id={fid}
                    rows={2}
                    value={draft.description}
                    onChange={(e) => set({ description: e.target.value })}
                    className={`${input} py-3`}
                  />
                )}
              </Field>
            </div>
            <Field label={t.fields.category}>
              {(fid) => (
                <select
                  id={fid}
                  value={draft.category}
                  onChange={(e) => set({ category: e.target.value as Draft["category"] })}
                  className={input}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t.fields.tags}>
              {(fid) => (
                <input
                  id={fid}
                  value={draft.tags}
                  onChange={(e) => set({ tags: e.target.value })}
                  className={input}
                />
              )}
            </Field>
            <Field label={t.fields.levelMin}>
              {(fid) => (
                <select
                  id={fid}
                  value={draft.levelMin}
                  onChange={(e) => set({ levelMin: e.target.value as Draft["levelMin"] })}
                  className={input}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {strings.catalog.levels[l]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t.fields.levelMax}>
              {(fid) => (
                <select
                  id={fid}
                  value={draft.levelMax}
                  onChange={(e) => set({ levelMax: e.target.value as Draft["levelMax"] })}
                  className={input}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {strings.catalog.levels[l]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t.fields.thumbnail}>
              {(fid) => (
                <input
                  id={fid}
                  value={draft.thumbnail.src}
                  placeholder="/images/activities/<slug>/thumb.webp"
                  onChange={(e) => set({ thumbnail: { ...draft.thumbnail, src: e.target.value } })}
                  className={input}
                />
              )}
            </Field>
            <Field label={t.fields.thumbnailAlt}>
              {(fid) => (
                <input
                  id={fid}
                  value={draft.thumbnail.alt}
                  onChange={(e) => set({ thumbnail: { ...draft.thumbnail, alt: e.target.value } })}
                  className={input}
                />
              )}
            </Field>
            {draft.thumbnail.src && (
              // eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary path or URL
              <img
                src={draft.thumbnail.src}
                alt=""
                className="aspect-[16/10] w-48 rounded-xl border border-border-subtle object-cover"
              />
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => set({ featured: e.target.checked })}
                className="size-4 accent-(--accent)"
              />
              {t.fields.featured}
            </label>
          </section>

          <section aria-labelledby="content-title" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="content-title" className="font-display text-3xl">
                {t.content}
              </h2>
              <div className="flex gap-2">
                <div
                  role="tablist"
                  aria-label={t.content}
                  className="flex rounded-full border border-border-subtle p-0.5"
                >
                  {(["texts", "json"] as const).map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={tab === name}
                      onClick={() => setTab(name)}
                      className={`min-h-10 rounded-full px-4 text-sm ${tab === name ? "bg-accent-muted text-accent" : "text-fg-secondary"}`}
                    >
                      {name === "texts" ? t.texts : t.json}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm(t.templateConfirm))
                      setContent(CONTENT_TEMPLATES[draft.type]);
                  }}
                >
                  {t.insertTemplate}
                </Button>
              </div>
            </div>
            {tab === "texts" ? (
              <div role="tabpanel" aria-label={t.texts} className="space-y-3">
                <p className="text-sm text-muted">{t.textsHint}</p>
                {fields.map((f) => (
                  <Field key={f.path.join(".")} label={describePath(f.path)}>
                    {(fid) =>
                      f.value.length > 80 ? (
                        <textarea
                          id={fid}
                          rows={3}
                          value={f.value}
                          onChange={(e) =>
                            setContent(setAtPath(draft.content, f.path, e.target.value))
                          }
                          className={`${input} py-3`}
                        />
                      ) : (
                        <input
                          id={fid}
                          value={f.value}
                          onChange={(e) =>
                            setContent(setAtPath(draft.content, f.path, e.target.value))
                          }
                          className={input}
                        />
                      )
                    }
                  </Field>
                ))}
              </div>
            ) : (
              <div role="tabpanel" aria-label={t.json} className="space-y-2">
                <label htmlFor="content-json" className="sr-only">
                  {t.json}
                </label>
                <textarea
                  id="content-json"
                  value={jsonText}
                  spellCheck={false}
                  rows={22}
                  aria-invalid={jsonError || undefined}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    try {
                      set({ content: JSON.parse(e.target.value) });
                      setJsonError(false);
                    } catch {
                      setJsonError(true);
                    }
                  }}
                  className={`${input} py-3 font-mono text-sm ${jsonError ? "border-error" : ""}`}
                />
                {jsonError && <p className="text-sm text-error">{t.invalidJson}</p>}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-border-subtle bg-elevated p-4 text-sm"
          >
            {valid ? (
              <p className="flex items-center gap-2 text-success">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                {t.valid}
              </p>
            ) : (
              <>
                <p className="mb-2 font-medium text-error">{t.errorsTitle}</p>
                <ul className="space-y-1 font-mono text-xs text-fg-secondary">
                  {jsonError && <li>{t.invalidJson}</li>}
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-elevated p-4">
            <p className="text-xs tracking-widest text-muted uppercase">
              {strings.admin.columns.status}: {strings.admin.statuses[draft.status]}
            </p>
            {draft.status === "draft" ? (
              <>
                <Button
                  onClick={() => save({ status: "published" }, t.published)}
                  disabled={busy || !valid}
                >
                  {t.publish}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => save({}, t.saved)}
                  disabled={busy || jsonError || slugTaken}
                >
                  {t.saveDraft}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => save({}, t.saved)} disabled={busy || !valid}>
                  {t.saveChanges}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => save({ status: "draft" }, t.saved)}
                  disabled={busy}
                >
                  {t.unpublish}
                </Button>
              </>
            )}
            {needsReview(draft) && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => save(reviewPatch(), t.saved)}
                  disabled={busy || jsonError || slugTaken}
                >
                  {t.markReviewed}
                </Button>
                {reviewMode && (
                  <Button
                    variant="secondary"
                    onClick={saveAndNext}
                    disabled={busy || jsonError || slugTaken || queue === null}
                  >
                    {t.saveAndNext}
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              disabled={!valid}
              onClick={() => {
                setPreviewKey((k) => k + 1);
                previewRef.current?.showModal();
              }}
            >
              <Eye aria-hidden="true" className="size-4" />
              {t.preview}
            </Button>
            {!isNewActivity && (
              <Button variant="ghost" onClick={duplicate} disabled={busy}>
                <Copy aria-hidden="true" className="size-4" />
                {t.duplicate}
              </Button>
            )}
            <Button variant="ghost" onClick={exportJson}>
              <Download aria-hidden="true" className="size-4" />
              {t.exportJson}
            </Button>
            {!isNewActivity && (
              <Button
                variant="ghost"
                onClick={() => deleteRef.current?.showModal()}
                className="text-error"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                {t.delete}
              </Button>
            )}
          </div>
        </aside>
      </div>

      <dialog
        ref={previewRef}
        aria-label={t.preview}
        className="m-auto h-[90vh] w-[min(1200px,95vw)] rounded-2xl border border-border-subtle bg-primary p-0 text-fg backdrop:bg-black/60"
      >
        <div className="flex justify-end p-2">
          <Button
            variant="ghost"
            aria-label={t.closePreview}
            onClick={() => previewRef.current?.close()}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>
        {valid && validation.ok && (
          <ActivityPlayer
            key={previewKey}
            editable={false}
            activity={{ ...validation.activity, id: loadedId ?? "preview" } as PlayableActivity}
          />
        )}
      </dialog>

      <dialog
        ref={deleteRef}
        aria-labelledby="delete-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-6 text-fg backdrop:bg-black/50"
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (deleteText !== draft.title || !loadedId) return;
            setBusy(true);
            try {
              await deleteActivity(loadedId);
              toast(t.deleted);
              router.push("/admin");
            } catch {
              toast(t.saveError);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 id="delete-title" className="font-display text-2xl">
            {t.deleteTitle}
          </h2>
          <label htmlFor="delete-confirm" className="block text-sm text-fg-secondary">
            {t.deleteHint(draft.title)}
          </label>
          <input
            id="delete-confirm"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            className={input}
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => deleteRef.current?.close()}>
              {strings.dashboard.cancel}
            </Button>
            <Button
              type="submit"
              disabled={busy || deleteText !== draft.title}
              className="bg-error text-primary"
            >
              {t.deleteConfirm}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
