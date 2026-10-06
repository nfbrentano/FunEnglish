"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Check,
  Clock,
  GripVertical,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import { useCatalogIndex } from "@/lib/catalog/use-catalog-index";
import { useClasses } from "@/lib/classes/use-classes";
import { createPlan, updatePlan } from "@/lib/plans/repository";
import {
  calculateDurationDifference,
  sumMinutes,
  type Plan,
  type PlanItem,
  type PlanTargetType,
} from "@/lib/plans/types";
import { getTeacherLessons } from "@/lib/schedule/repository";
import type { Lesson } from "@/lib/schedule/types";

interface PlanEditorModalProps {
  open: boolean;
  onClose: () => void;
  plan?: Plan | null;
  initialTarget?: { targetType: PlanTargetType; classId?: string; studentId?: string };
  initialTitle?: string;
  initialItems?: PlanItem[];
  initialGoal?: string;
  initialWords?: string[];
  suggestedWords?: string[];
  onSaved?: (plan: Plan) => void;
}

export function PlanEditorModal({
  open,
  onClose,
  plan,
  initialTarget,
  initialTitle,
  initialItems,
  initialGoal,
  initialWords,
  suggestedWords = [],
  onSaved,
}: PlanEditorModalProps) {
  const { user } = useAuth();
  const { classes, students } = useClasses();
  const { index: catalogIndex } = useCatalogIndex();
  const toast = useToast();

  const [targetType, setTargetType] = useState<PlanTargetType>(
    plan?.targetType || initialTarget?.targetType || "student",
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    plan?.studentId || initialTarget?.studentId || "",
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    plan?.classId || initialTarget?.classId || "",
  );

  const [title, setTitle] = useState(plan?.title || initialTitle || "");
  const [goal, setGoal] = useState(plan?.goal || initialGoal || "");
  const [scheduledDateStr, setScheduledDateStr] = useState(
    plan?.scheduledFor
      ? new Date(plan.scheduledFor.getTime() - plan.scheduledFor.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : "",
  );
  const [durationMin, setDurationMin] = useState<number>(plan?.durationMin || 50);
  const [lessonId, setLessonId] = useState<string>(plan?.lessonId || "");

  const [items, setItems] = useState<PlanItem[]>(
    plan?.items ? plan.items.map((it) => ({ ...it })) : initialItems || [],
  );

  const [words, setWords] = useState<string[]>(
    plan?.words ? [...plan.words] : initialWords || [],
  );
  const [wordInput, setWordInput] = useState("");

  const [isActivityPickerOpen, setIsActivityPickerOpen] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [customBlockTitle, setCustomBlockTitle] = useState("");
  const [customBlockMinutes, setCustomBlockMinutes] = useState(5);
  const [isAddingCustomBlock, setIsAddingCustomBlock] = useState(false);

  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when plan / modal open changes
  useEffect(() => {
    if (open) {
      if (plan) {
        setTargetType(plan.targetType);
        setSelectedStudentId(plan.studentId || "");
        setSelectedClassId(plan.classId || "");
        setTitle(plan.title);
        setGoal(plan.goal || "");
        setScheduledDateStr(
          plan.scheduledFor
            ? new Date(plan.scheduledFor.getTime() - plan.scheduledFor.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            : "",
        );
        setDurationMin(plan.durationMin || 50);
        setLessonId(plan.lessonId || "");
        setItems(plan.items.map((it) => ({ ...it })));
        setWords([...plan.words]);
      } else {
        setTargetType(initialTarget?.targetType || (initialTarget?.studentId ? "student" : "class"));
        setSelectedStudentId(initialTarget?.studentId || (students[0]?.id ?? ""));
        setSelectedClassId(initialTarget?.classId || (classes[0]?.id ?? ""));
        setTitle(initialTitle || "");
        setGoal(initialGoal || "");
        setScheduledDateStr("");
        setDurationMin(50);
        setLessonId("");
        setItems(initialItems ? initialItems.map((it) => ({ ...it })) : []);
        setWords(initialWords ? [...initialWords] : []);
      }
    }
  }, [open, plan, initialTarget, initialTitle, initialItems, initialGoal, initialWords, students, classes]);

  // Load upcoming lessons for selected student
  useEffect(() => {
    if (!user || targetType !== "student" || !selectedStudentId) {
      setUpcomingLessons([]);
      return;
    }
    const now = new Date();
    const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    getTeacherLessons(user.uid, now, future)
      .then((all) => {
        const studentLessons = all.filter(
          (l) => l.studentId === selectedStudentId && l.status === "scheduled",
        );
        setUpcomingLessons(studentLessons);
      })
      .catch((err) => console.warn("Failed loading upcoming lessons:", err));
  }, [user, targetType, selectedStudentId]);

  // When a lesson is picked, sync duration and date
  const handleSelectLesson = (lId: string) => {
    setLessonId(lId);
    const found = upcomingLessons.find((l) => l.id === lId);
    if (found) {
      setDurationMin(found.durationMin);
      setScheduledDateStr(
        new Date(found.start.getTime() - found.start.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16),
      );
    }
  };

  const totalMinutes = useMemo(() => sumMinutes(items), [items]);
  const durationDiff = useMemo(
    () => calculateDurationDifference(totalMinutes, durationMin),
    [totalMinutes, durationMin],
  );

  const filteredCatalog = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    if (!q) return catalogIndex.items.slice(0, 15);
    return catalogIndex.items
      .filter((a) => a.title.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 15);
  }, [catalogIndex.items, activitySearch]);

  const handleAddActivity = (activity: { id: string; title: string }) => {
    if (items.length >= 15) {
      toast("Maximum 15 items per lesson plan.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        kind: "activity",
        activityId: activity.id,
        title: activity.title,
        minutes: 10,
      },
    ]);
    setIsActivityPickerOpen(false);
    setActivitySearch("");
  };

  const handleAddCustomBlock = () => {
    const bTitle = customBlockTitle.trim();
    if (!bTitle) return;
    if (items.length >= 15) {
      toast("Maximum 15 items per lesson plan.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        kind: "block",
        title: bTitle,
        minutes: Math.max(1, Math.min(60, customBlockMinutes)),
      },
    ]);
    setCustomBlockTitle("");
    setCustomBlockMinutes(5);
    setIsAddingCustomBlock(false);
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      copy.splice(target, 0, removed);
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemMinutes = (index: number, mins: number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, minutes: Math.max(1, Math.min(60, mins)) } : it)),
    );
  };

  const handleAddWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const w = wordInput.trim();
    if (!w) return;
    if (words.length >= 30) {
      toast("Maximum 30 target words.");
      return;
    }
    if (!words.some((existing) => existing.toLowerCase() === w.toLowerCase())) {
      setWords((prev) => [...prev, w]);
    }
    setWordInput("");
  };

  const handleAddSuggestedWord = (w: string) => {
    if (words.length >= 30) {
      toast("Maximum 30 target words.");
      return;
    }
    if (!words.some((existing) => existing.toLowerCase() === w.toLowerCase())) {
      setWords((prev) => [...prev, w]);
    }
  };

  const handleRemoveWord = (w: string) => {
    setWords((prev) => prev.filter((word) => word !== w));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast("Please enter a title for the plan.");
      return;
    }
    if (cleanTitle.length > 80) {
      toast("Title must be 80 characters or fewer.");
      return;
    }
    if (items.length === 0) {
      toast("Please add at least one item to the plan.");
      return;
    }
    if (items.length > 15) {
      toast("A plan can have at most 15 items.");
      return;
    }
    if (words.length > 30) {
      toast("A plan can have at most 30 target words.");
      return;
    }

    if (targetType === "student" && !selectedStudentId) {
      toast("Please select a student.");
      return;
    }
    if (targetType === "class" && !selectedClassId) {
      toast("Please select a class.");
      return;
    }

    try {
      setIsSaving(true);
      const scheduledFor = scheduledDateStr ? new Date(scheduledDateStr) : undefined;
      const payload = {
        targetType,
        studentId: targetType === "student" ? selectedStudentId : undefined,
        classId: targetType === "class" ? selectedClassId : undefined,
        lessonId: lessonId || undefined,
        title: cleanTitle,
        goal: goal.trim() || undefined,
        scheduledFor,
        durationMin,
        items,
        words,
      };

      let savedPlan: Plan;
      if (plan) {
        await updatePlan(user.uid, plan.id, payload);
        savedPlan = {
          ...plan,
          ...payload,
          updatedAt: new Date(),
        };
        toast("Lesson plan updated!");
      } else {
        savedPlan = await createPlan(user.uid, payload);
        toast("Lesson plan created!");
      }

      onSaved?.(savedPlan);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving lesson plan");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-8 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-border-subtle bg-elevated shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-muted text-accent">
              <BookOpen className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-medium text-fg">
                {plan ? "Edit Lesson Plan" : "New Lesson Plan"}
              </h2>
              <p className="text-xs text-fg-secondary">
                Prepare activities, target vocabulary and sequence ahead of class
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Target: Student or Class */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Lesson Target
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType("student")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  targetType === "student"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-subtle bg-secondary text-fg-secondary hover:bg-elevated"
                }`}
              >
                <Users className="size-4" />
                Individual Student (1:1)
              </button>
              <button
                type="button"
                onClick={() => setTargetType("class")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  targetType === "class"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-subtle bg-secondary text-fg-secondary hover:bg-elevated"
                }`}
              >
                <Layers className="size-4" />
                Class / Group
              </button>
            </div>

            {targetType === "student" ? (
              <div className="space-y-1.5">
                <label className="text-xs text-fg-secondary">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
                  required
                >
                  <option value="" disabled>
                    Choose a student...
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs text-fg-secondary">Select Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
                  required
                >
                  <option value="" disabled>
                    Choose a class...
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Optional: Link to Scheduled Lesson */}
          {targetType === "student" && upcomingLessons.length > 0 && (
            <div className="space-y-1.5 rounded-2xl border border-border-subtle bg-secondary/60 p-3.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-fg">
                <Calendar className="size-3.5 text-accent" />
                Link to Scheduled Lesson (from Calendar)
              </label>
              <select
                value={lessonId}
                onChange={(e) => handleSelectLesson(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-primary p-2 text-xs text-fg"
              >
                <option value="">No linked lesson (standalone plan)</option>
                {upcomingLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {new Date(l.start).toLocaleDateString()} at{" "}
                    {new Date(l.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                    ({l.durationMin} min)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title & Timing */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-fg">Plan Title</label>
              <input
                type="text"
                maxLength={80}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Travel Vocabulary & Past Simple"
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg placeholder:text-muted"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fg">Lesson Duration</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value) || 50)}
                  className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
                />
                <span className="text-xs text-fg-secondary">min</span>
              </div>
            </div>
          </div>

          {/* Date & Time if not linked */}
          {!lessonId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fg">Scheduled Date (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledDateStr}
                onChange={(e) => setScheduledDateStr(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
            </div>
          )}

          {/* Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg flex items-center justify-between">
              <span>Goal / Lesson Objective</span>
              <span className="text-muted text-[10px]">{goal.length}/300</span>
            </label>
            <textarea
              maxLength={300}
              rows={2}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Practice past irregular verbs and order food in a restaurant"
              className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg placeholder:text-muted"
            />
          </div>

          {/* Items Sequence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted block">
                  Activities & Sequence ({items.length}/15)
                </label>
                <span className="text-xs text-fg-secondary">
                  Total planned: <strong className="text-fg">{totalMinutes} min</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => setIsAddingCustomBlock((prev) => !prev)}
                >
                  <Plus className="size-3.5 mr-1" />
                  Custom Block
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs bg-accent text-primary hover:bg-accent/90"
                  onClick={() => setIsActivityPickerOpen(true)}
                >
                  <Plus className="size-3.5 mr-1" />
                  Activity
                </Button>
              </div>
            </div>

            {/* Duration warning (CA02) */}
            {durationDiff.exceeds && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{durationDiff.warning}</span>
              </div>
            )}

            {/* Custom block inline form */}
            {isAddingCustomBlock && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border-strong bg-secondary/50 p-3">
                <input
                  type="text"
                  placeholder="Block name (e.g. Warm-up conversation)"
                  value={customBlockTitle}
                  onChange={(e) => setCustomBlockTitle(e.target.value)}
                  className="flex-1 min-w-44 rounded-xl border border-border-subtle bg-primary p-2 text-xs text-fg"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customBlockMinutes}
                    onChange={(e) => setCustomBlockMinutes(Number(e.target.value) || 5)}
                    className="w-16 rounded-xl border border-border-subtle bg-primary p-2 text-xs text-fg"
                  />
                  <span className="text-xs text-muted">min</span>
                </div>
                <Button type="button" size="sm" onClick={handleAddCustomBlock} className="text-xs">
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingCustomBlock(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Items list */}
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-xs text-muted">
                No items in plan yet. Add catalog activities or custom discussion blocks.
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-primary/20">
                {items.map((item, index) => (
                  <li
                    key={`${index}-${item.title}`}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-fg">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-fg truncate">{item.title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              item.kind === "activity"
                                ? "bg-accent/15 text-accent"
                                : "bg-secondary text-muted"
                            }`}
                          >
                            {item.kind}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3 text-muted" />
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={item.minutes}
                          onChange={(e) => handleUpdateItemMinutes(index, Number(e.target.value))}
                          className="w-14 rounded-lg border border-border-subtle bg-primary px-1.5 py-0.5 text-xs text-fg"
                        />
                        <span className="text-[11px] text-muted">m</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveItem(index, "up")}
                          aria-label={`Move ${item.title} up`}
                          className="p-1 text-fg-secondary hover:text-fg disabled:opacity-20"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === items.length - 1}
                          onClick={() => handleMoveItem(index, "down")}
                          aria-label={`Move ${item.title} down`}
                          className="p-1 text-fg-secondary hover:text-fg disabled:opacity-20"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          aria-label={`Delete ${item.title}`}
                          className="p-1 text-fg-secondary hover:text-error"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Target Vocabulary */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block">
              Target Vocabulary ({words.length}/30)
            </label>

            {/* Suggested unlearned words from student profile (RF09) */}
            {suggestedWords.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-accent/20 bg-accent/5 p-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
                  <Sparkles className="size-3.5" />
                  Suggested from student&apos;s unlearned vocabulary:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedWords.map((sw) => (
                    <button
                      key={sw}
                      type="button"
                      onClick={() => handleAddSuggestedWord(sw)}
                      className="flex items-center gap-1 rounded-full border border-border-subtle bg-secondary px-2.5 py-0.5 text-xs text-fg-secondary hover:border-accent hover:text-accent"
                    >
                      <Plus className="size-3" />
                      {sw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add target word (press Enter)"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddWord();
                  }
                }}
                className="flex-1 rounded-xl border border-border-subtle bg-primary p-2.5 text-xs text-fg placeholder:text-muted"
              />
              <Button type="button" size="sm" variant="secondary" onClick={() => handleAddWord()}>
                Add
              </Button>
            </div>

            {words.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {words.map((w) => (
                  <span
                    key={w}
                    className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-fg"
                  >
                    {w}
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(w)}
                      className="text-fg-secondary hover:text-fg"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-accent text-primary hover:bg-accent/90"
            >
              {isSaving ? "Saving..." : plan ? "Update Plan" : "Save Lesson Plan"}
            </Button>
          </div>
        </form>

        {/* Nested Activity Picker Modal */}
        {isActivityPickerOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border-subtle bg-elevated shadow-xl">
              <div className="flex items-center justify-between border-b border-border-subtle p-4">
                <h3 className="text-sm font-semibold text-fg">Choose Activity from Catalog</h3>
                <button
                  type="button"
                  onClick={() => setIsActivityPickerOpen(false)}
                  className="p-1 text-fg-secondary hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-4 border-b border-border-subtle">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search catalog activities..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-primary py-2 pl-9 pr-3 text-xs text-fg"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredCatalog.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleAddActivity(act)}
                    className="flex w-full items-center justify-between rounded-xl border border-border-subtle p-3 text-left transition-colors hover:border-accent hover:bg-secondary"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-fg truncate">{act.title}</p>
                      <p className="text-[11px] text-muted capitalize">
                        {act.category} · {act.levelMin}
                      </p>
                    </div>
                    <Plus className="size-4 text-accent shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
