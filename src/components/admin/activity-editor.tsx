"use client";

import {
  ArrowLeft,
  History,
  ImagePlus,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { ActivityPlayer } from "@/components/player/activity-player";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/activities/categories";
import { LEVELS } from "@/lib/activities/levels";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/activities/schema/activity";
import { MAX_ACTIVITY_BYTES, validateActivity } from "@/lib/activities/validate";
import { jsonBytes } from "@/lib/admin/revisions";
import {
  deleteActivity,
  getActivity,
  isSlugTaken,
  listActivities,
  restoreRevision,
  SaveConflictError,
  saveActivity,
  type AdminActivity,
} from "@/lib/admin/activities-admin";
import { collectTextFields, describePath, setAtPath, slugify } from "@/lib/admin/content-fields";
import { needsReview } from "@/lib/admin/filter";
import { planImages } from "@/lib/admin/plan-images";
import {
  clearLocalDraft,
  readLocalDraft,
  writeLocalDraft,
  type LocalDraft,
} from "@/lib/admin/local-draft";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { BLANK_CONTENT, CONTENT_TEMPLATES } from "@/lib/admin/templates";
import { useAuth } from "@/lib/auth/use-auth";
import type { PlayableActivity } from "@/lib/player/load-activity";
import { PLUGINS } from "@/lib/player/registry";
import { strings } from "@/lib/strings";
import { useQueryParam } from "@/lib/use-query-param";
import { editHref } from "./admin-list";
import { Field } from "./content/fields";
import { ErrorsProvider, friendlyMessage, pathKey, type Path } from "./content/form-context";
import type { Json } from "./content/fields";
import { ImageFields } from "./content/image-fields";
import { ImagePathsContext, ImageToolsContext } from "./content/image-paths";
import { StructuredEditor } from "./content/structured-editor";
import { HistoryDialog } from "./history-dialog";
import { LivePreview } from "./live-preview";

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

type NewOptions = {
  start?: string | null;
  type?: string | null;
  category?: string | null;
  level?: string | null;
};

/** A new activity, optionally prefilled from /admin/new (spec: gestão completa, RF08). */
function newDraft(options: NewOptions = {}): Draft {
  const type = (ACTIVITY_TYPES as readonly string[]).includes(options.type ?? "")
    ? (options.type as ActivityType)
    : "quiz";
  const category = CATEGORIES.some((c) => c.id === options.category)
    ? (options.category as Draft["category"])
    : "grammar";
  const level = (LEVELS as readonly string[]).includes(options.level ?? "")
    ? (options.level as Draft["levelMin"])
    : null;
  return {
    title: "",
    slug: "",
    description: "",
    category,
    levelMin: level ?? "beginner",
    levelMax: level ?? "intermediate",
    type,
    tags: "",
    status: "draft",
    featured: false,
    thumbnail: { src: "", alt: "", source: "ai" },
    origin: "human",
    reviewStatus: "reviewed",
    content: options.start === "blank" ? BLANK_CONTENT[type] : CONTENT_TEMPLATES[type],
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

const FIELD_LABELS: Record<string, string> = {
  title: t.fields.title,
  slug: t.fields.slug,
  description: t.fields.description,
  category: t.fields.category,
  type: t.fields.type,
  tags: t.fields.tags,
  levelMin: t.fields.levelMin,
  levelMax: t.fields.levelMax,
  thumbnail: t.fields.thumbnail,
};

/** ["content", "questions", 2, "options"] → "Question 3 · options" */
function issueLocation(path: Path): string {
  if (path.length === 0) return t.editTitle;
  if (path[0] !== "content") return FIELD_LABELS[String(path[0])] ?? String(path[0]);
  return describePath(path.slice(1)) || t.content;
}

/** Create or edit one activity (spec: painel admin). Reads ?id= and ?review=1 from the URL. */
export function ActivityEditor({
  imagePaths = [],
  imageStyle = "",
}: {
  imagePaths?: string[];
  /** content/prompts/image-style.md, for "Write prompt from alt". */
  imageStyle?: string;
}) {
  // Uploaded images not deployed yet: shown from memory (spec: imagens pelo painel, RF07).
  const [previews, setPreviews] = useState<ReadonlyMap<string, string>>(new Map());
  const id = useQueryParam("id");
  const reviewMode = useQueryParam("review") === "1";
  const newOptions = {
    start: useQueryParam("start"),
    type: useQueryParam("type"),
    category: useQueryParam("category"),
    level: useQueryParam("level"),
  };
  const newKey = JSON.stringify(newOptions);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [loadedId, setLoadedId] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(newDraft().content, null, 2));
  const [jsonError, setJsonError] = useState(false);
  const [tab, setTab] = useState<"form" | "texts" | "json">("form");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDialogElement>(null);
  const deleteRef = useRef<HTMLDialogElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [deleteText, setDeleteText] = useState("");
  const [queue, setQueue] = useState<string[] | null>(null);
  // What's on the server, to tell unsaved changes and conflicts (spec: gestão completa, RF12).
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<Date | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft<Draft> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // New activity: a field's error shows once the author has visited it (not all red at first).
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const touch = (key: string | undefined) => {
    if (key) setTouched((current) => (current.has(key) ? current : new Set(current).add(key)));
  };
  const conflictRef = useRef<HTMLDialogElement>(null);
  const historyRef = useRef<HTMLDialogElement>(null);
  const planRef = useRef<HTMLDialogElement>(null);
  const [planAnswers, setPlanAnswers] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conflict, setConflict] = useState<{
    patch: Partial<Draft>;
    message: string;
    next?: () => void;
  } | null>(null);

  // Load the activity (or start a new one) whenever ?id changes.
  useEffect(() => {
    let active = true;
    const load = id ? getActivity(id) : Promise.resolve(null);
    load
      .then((activity) => {
        if (!active) return;
        const next = activity ? toDraft(activity) : newDraft(JSON.parse(newKey) as NewOptions);
        const local = readLocalDraft<Draft>(activity?.id ?? null);
        setLocalDraft(local && JSON.stringify(local.draft) !== JSON.stringify(next) ? local : null);
        setSavedJson(JSON.stringify(next));
        setLoadedUpdatedAt(activity?.updatedAt ?? null);
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
  }, [id, reloadKey, newKey]);

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
  const issues = [
    ...(validation.ok ? [] : validation.issues),
    ...(slugTaken ? [{ path: ["slug"], message: t.slugTaken }] : []),
  ];

  const dirty = savedJson !== null && JSON.stringify(draft) !== savedJson;
  useUnsavedChanges(dirty, t.unsavedLeave);

  // Keep unsaved changes on this device until they're saved.
  useEffect(() => {
    if (!dirty || loadedId === undefined) return;
    const timer = setTimeout(() => writeLocalDraft(loadedId, draft), 1000);
    return () => clearTimeout(timer);
  }, [dirty, draft, loadedId]);

  /** Error summary → the field (spec: gestão completa, RF06). Parents are tried when needed. */
  function focusIssue(path: Path) {
    touch(pathKey(path));
    if (path[0] === "content" && tab !== "form") setTab("form");
    requestAnimationFrame(() => {
      for (let n = path.length; n >= 0; n--) {
        const target = document.querySelector<HTMLElement>(
          `[data-path="${CSS.escape(pathKey(path.slice(0, n)))}"]`,
        );
        if (target) {
          target.focus();
          target.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }
    });
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setContent = (content: unknown) => {
    set({ content });
    setJsonText(JSON.stringify(content, null, 2));
    setJsonError(false);
  };

  const author = user
    ? { uid: user.uid, name: user.displayName ?? user.email ?? user.uid }
    : undefined;

  async function save(
    patch: Partial<Draft>,
    message: string,
    next?: () => void,
    { force = false }: { force?: boolean } = {},
  ) {
    const toSave = toCandidate({ ...draft, ...patch });
    if (slugTaken || jsonError) return;
    // Drafts too: Firestore documents are capped, and the site keeps activities small (CA17).
    const bytes = jsonBytes(toSave);
    if (bytes > MAX_ACTIVITY_BYTES) {
      toast(t.tooLarge(Math.ceil(bytes / 1024)));
      return;
    }
    if (toSave.status === "published" && (!valid || !validateActivity(toSave).ok)) return;
    setBusy(true);
    try {
      if (await isSlugTaken(toSave.slug, loadedId ?? null)) {
        setSlugTaken(true);
        return;
      }
      const saved = await saveActivity(
        loadedId ?? null,
        toSave as Parameters<typeof saveActivity>[1],
        { expectedUpdatedAt: loadedId ? loadedUpdatedAt : undefined, force, author },
      );
      const savedDraft = { ...draft, ...patch };
      setDraft(savedDraft);
      setSavedJson(JSON.stringify(savedDraft));
      setLoadedUpdatedAt(saved.updatedAt);
      clearLocalDraft(loadedId ?? null);
      toast(message);
      if (next) next();
      else if (saved.id !== loadedId) router.replace(editHref(saved.id));
    } catch (error) {
      if (error instanceof SaveConflictError) {
        setConflict({ patch, message, next });
        conflictRef.current?.showModal();
        return;
      }
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
      const { id: copyId } = await saveActivity(
        null,
        toCandidate({
          ...draft,
          title: `${draft.title} (${t.copy})`,
          slug,
          status: "draft",
        }) as Parameters<typeof saveActivity>[1],
        { author, summary: `Duplicated from ${draft.slug}` },
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
        className="mx-auto w-full max-w-300 px-4 py-12"
      >
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const fields = collectTextFields(draft.content);
  const isNewActivity = loadedId === null;

  return (
    <ImagePathsContext.Provider value={imagePaths}>
      <ImageToolsContext.Provider
        value={{
          slug: draft.slug,
          style: imageStyle,
          previews,
          setPreview: (src, url) => setPreviews((m) => new Map(m).set(src, url)),
        }}
      >
        <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-10">
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
          {localDraft && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-muted px-4 py-3 text-sm"
            >
              <p>{t.localDraft(new Date(localDraft.savedAt).toLocaleString("en-US"))}</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDraft(localDraft.draft);
                    setJsonText(JSON.stringify(localDraft.draft.content, null, 2));
                    setJsonError(false);
                    setLocalDraft(null);
                  }}
                >
                  {t.restoreDraft}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearLocalDraft(loadedId);
                    setLocalDraft(null);
                  }}
                >
                  {t.discardDraft}
                </Button>
              </div>
            </div>
          )}
          <h1 className="font-display text-5xl font-medium">
            {isNewActivity ? t.newTitle : draft.title || t.editTitle}
          </h1>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_440px]">
            <ErrorsProvider
              issues={issues}
              isVisible={(key) => loadedId !== null || touched.has(key)}
            >
              <div
                className="space-y-8"
                onBlur={(e) => touch((e.target as HTMLElement).dataset.path)}
              >
                <section
                  aria-label={t.editTitle}
                  className="grid gap-4 rounded-2xl border border-border-subtle bg-elevated p-5 sm:grid-cols-2"
                >
                  <div className="sm:col-span-2">
                    <Field label={t.fields.title} path={["title"]}>
                      {(p) => (
                        <input
                          {...p}
                          value={draft.title}
                          onChange={(e) =>
                            set({
                              title: e.target.value,
                              ...(slugEdited ? {} : { slug: slugify(e.target.value) }),
                            })
                          }
                          className={p.className}
                        />
                      )}
                    </Field>
                  </div>
                  <Field label={t.fields.slug} path={["slug"]}>
                    {(p) => (
                      <input
                        {...p}
                        value={draft.slug}
                        onChange={(e) => {
                          setSlugEdited(true);
                          set({ slug: e.target.value });
                        }}
                        className={p.className}
                      />
                    )}
                  </Field>
                  <Field label={t.fields.type} path={["type"]}>
                    {(p) => (
                      <select
                        {...p}
                        value={draft.type}
                        onChange={(e) => {
                          const type = e.target.value as ActivityType;
                          set({ type });
                          if (window.confirm(t.typeChangeConfirm))
                            setContent(CONTENT_TEMPLATES[type]);
                        }}
                        className={p.className}
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
                    <Field label={t.fields.description} path={["description"]}>
                      {(p) => (
                        <textarea
                          {...p}
                          rows={2}
                          value={draft.description}
                          onChange={(e) => set({ description: e.target.value })}
                          className={`${p.className} py-3`}
                        />
                      )}
                    </Field>
                  </div>
                  <Field label={t.fields.category} path={["category"]}>
                    {(p) => (
                      <select
                        {...p}
                        value={draft.category}
                        onChange={(e) => set({ category: e.target.value as Draft["category"] })}
                        className={p.className}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label={t.fields.tags} path={["tags"]}>
                    {(p) => (
                      <input
                        {...p}
                        value={draft.tags}
                        onChange={(e) => set({ tags: e.target.value })}
                        className={p.className}
                      />
                    )}
                  </Field>
                  <Field label={t.fields.levelMin} path={["levelMin"]}>
                    {(p) => (
                      <select
                        {...p}
                        value={draft.levelMin}
                        onChange={(e) => set({ levelMin: e.target.value as Draft["levelMin"] })}
                        className={p.className}
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {strings.catalog.levels[l]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label={t.fields.levelMax} path={["levelMax"]}>
                    {(p) => (
                      <select
                        {...p}
                        value={draft.levelMax}
                        onChange={(e) => set({ levelMax: e.target.value as Draft["levelMax"] })}
                        className={p.className}
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {strings.catalog.levels[l]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <fieldset className="space-y-3 sm:col-span-2">
                    <legend className="mb-2 text-sm font-medium">{t.thumbnailTitle}</legend>
                    <ImageFields
                      value={draft.thumbnail as unknown as Json}
                      path={["thumbnail"]}
                      srcLabel={t.fields.thumbnail}
                      altLabel={t.fields.thumbnailAlt}
                      onChange={(thumbnail) =>
                        set({ thumbnail: thumbnail as unknown as Draft["thumbnail"] })
                      }
                    />
                  </fieldset>
                  <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(e) => set({ featured: e.target.checked })}
                      className="size-4 accent-accent"
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
                        {(["form", "texts", "json"] as const).map((name) => (
                          <button
                            key={name}
                            type="button"
                            role="tab"
                            aria-selected={tab === name}
                            onClick={() => setTab(name)}
                            className={`min-h-10 rounded-full px-4 text-sm ${tab === name ? "bg-accent-muted text-accent" : "text-fg-secondary"}`}
                          >
                            {name === "form" ? t.formTab : name === "texts" ? t.texts : t.json}
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
                      <Button
                        variant="ghost"
                        disabled={!draft.slug}
                        title={draft.slug ? undefined : strings.admin.upload.needsSlug}
                        onClick={() => {
                          setPlanAnswers(false);
                          planRef.current?.showModal();
                        }}
                      >
                        <ImagePlus aria-hidden="true" className="size-4" />
                        {t.plan.open}
                      </Button>
                    </div>
                  </div>
                  {tab === "form" ? (
                    <div role="tabpanel" aria-label={t.formTab}>
                      <StructuredEditor
                        type={draft.type}
                        value={draft.content}
                        onChange={setContent}
                      />
                    </div>
                  ) : tab === "texts" ? (
                    <div role="tabpanel" aria-label={t.texts} className="space-y-3">
                      <p className="text-sm text-muted">{t.textsHint}</p>
                      {fields.map((f) => (
                        <Field
                          key={f.path.join(".")}
                          label={describePath(f.path)}
                          path={["content", ...f.path]}
                        >
                          {(p) =>
                            f.value.length > 80 ? (
                              <textarea
                                {...p}
                                rows={3}
                                value={f.value}
                                onChange={(e) =>
                                  setContent(setAtPath(draft.content, f.path, e.target.value))
                                }
                                className={`${p.className} py-3`}
                              />
                            ) : (
                              <input
                                {...p}
                                value={f.value}
                                onChange={(e) =>
                                  setContent(setAtPath(draft.content, f.path, e.target.value))
                                }
                                className={p.className}
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
            </ErrorsProvider>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
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
                    <ul className="space-y-1.5 text-xs">
                      {jsonError && <li>{t.invalidJson}</li>}
                      {issues.map((issue, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => focusIssue(issue.path)}
                            className="text-left text-fg-secondary hover:text-fg hover:underline"
                          >
                            <span className="font-medium text-fg">{issueLocation(issue.path)}</span>
                            {": "}
                            {friendlyMessage(issue.message)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-elevated p-4">
                <p className="text-xs tracking-widest text-muted uppercase">
                  {strings.admin.columns.status}: {strings.admin.statuses[draft.status]}
                </p>
                {dirty && (
                  <p role="status" className="text-sm text-accent">
                    {t.unsaved}
                  </p>
                )}
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
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setHistoryOpen(true);
                      historyRef.current?.showModal();
                    }}
                  >
                    <History aria-hidden="true" className="size-4" />
                    {t.history.open}
                  </Button>
                )}
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
              <LivePreview
                activity={
                  valid && validation.ok
                    ? ({ ...validation.activity, id: loadedId ?? "preview" } as PlayableActivity)
                    : null
                }
              />
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
          {loadedId && (
            <HistoryDialog
              ref={historyRef}
              activityId={loadedId}
              current={candidate}
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              onRestore={async (revision) => {
                setBusy(true);
                try {
                  await restoreRevision(loadedId, revision, author);
                  historyRef.current?.close();
                  clearLocalDraft(loadedId);
                  toast(t.history.restored);
                  setReloadKey((k) => k + 1);
                } catch (error) {
                  console.warn("Restore failed", error);
                  toast(t.saveError);
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          <PlanImagesDialog
            ref={planRef}
            count={
              planImages(
                { slug: draft.slug, type: draft.type, content: draft.content },
                { style: imageStyle, answers: planAnswers },
              ).planned
            }
            isQuiz={draft.type === "quiz"}
            answers={planAnswers}
            onAnswersChange={setPlanAnswers}
            onPlan={() => {
              const { content, planned } = planImages(
                { slug: draft.slug, type: draft.type, content: draft.content },
                { style: imageStyle, answers: planAnswers },
              );
              setContent(content);
              planRef.current?.close();
              toast(t.plan.done(planned));
            }}
          />

          <dialog
            ref={conflictRef}
            aria-labelledby="conflict-title"
            className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-6 text-fg backdrop:bg-black/50"
            onClose={() => setConflict(null)}
          >
            <div className="space-y-4">
              <h2 id="conflict-title" className="font-display text-2xl">
                {t.conflictTitle}
              </h2>
              <p className="text-sm text-fg-secondary">{t.conflictText}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearLocalDraft(loadedId ?? null);
                    conflictRef.current?.close();
                    setReloadKey((k) => k + 1);
                  }}
                >
                  {t.conflictReload}
                </Button>
                <Button
                  onClick={() => {
                    const pending = conflict;
                    conflictRef.current?.close();
                    if (pending)
                      void save(pending.patch, pending.message, pending.next, { force: true });
                  }}
                >
                  {t.conflictOverwrite}
                </Button>
              </div>
            </div>
          </dialog>
        </div>
      </ImageToolsContext.Provider>
    </ImagePathsContext.Provider>
  );
}

/** "Plan images": pictures for every item without one (spec: mais imagens, RF06, CA06). */
const PlanImagesDialog = forwardRef<
  HTMLDialogElement,
  {
    count: number;
    isQuiz: boolean;
    answers: boolean;
    onAnswersChange: (answers: boolean) => void;
    onPlan: () => void;
  }
>(function PlanImagesDialog({ count, isQuiz, answers, onAnswersChange, onPlan }, ref) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="plan-title"
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-6 text-fg backdrop:bg-black/50"
    >
      <div className="space-y-4">
        <h2 id="plan-title" className="font-display text-2xl">
          {t.plan.title}
        </h2>
        <p className="text-sm text-fg-secondary">{t.plan.text}</p>
        {isQuiz && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={answers}
              onChange={(e) => onAnswersChange(e.target.checked)}
              className="size-4 accent-accent"
            />
            {t.plan.answers}
          </label>
        )}
        <p role="status" className="text-sm font-medium">
          {count === 0 ? t.plan.none : t.plan.count(count)}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => (ref as React.RefObject<HTMLDialogElement | null>).current?.close()}
          >
            {strings.dashboard.cancel}
          </Button>
          <Button disabled={count === 0} onClick={onPlan}>
            {t.plan.action(count)}
          </Button>
        </div>
      </div>
    </dialog>
  );
});
