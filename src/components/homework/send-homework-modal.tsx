"use client";

import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  QrCode,
  RefreshCw,
  Share2,
  Users,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import { getTeacherClasses, getTeacherStudents } from "@/lib/classes/repository";
import type { Student, TeacherClass } from "@/lib/classes/types";
import {
  callCreateHomework,
  callRegenerateStudentHomeworkToken,
  type IndividualLinkPayload,
} from "@/lib/functions";
import { strings } from "@/lib/strings";

interface SendHomeworkModalProps {
  activity: { id: string; title: string; slug?: string };
  open: boolean;
  onClose: () => void;
}

export function SendHomeworkModal({ activity, open, onClose }: SendHomeworkModalProps) {
  const { user } = useAuth();
  const toast = useToast();
  const modalId = useId();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states
  const [targetType, setTargetType] = useState<"class" | "students" | "anyone">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [allowLate, setAllowLate] = useState<boolean>(true);
  const [instruction, setInstruction] = useState<string>("");

  // Result state
  const [submitting, setSubmitting] = useState(false);
  const [createdHomeworkId, setCreatedHomeworkId] = useState<string | null>(null);
  const [individualLinks, setIndividualLinks] = useState<IndividualLinkPayload[]>([]);
  const [regeneratingStudentId, setRegeneratingStudentId] = useState<string | null>(null);

  // QR code modal state
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [qrModalTitle, setQrModalTitle] = useState<string>("");

  // Load teacher classes & students on mount / user change
  useEffect(() => {
    if (!open || !user) return;
    let active = true;

    setLoadingInitial(true);
    Promise.all([getTeacherClasses(user.uid), getTeacherStudents(user.uid)])
      .then(([loadedClasses, loadedStudents]) => {
        if (!active) return;
        setClasses(loadedClasses);
        setStudents(loadedStudents);
        if (loadedClasses.length > 0 && !selectedClassId) {
          setSelectedClassId(loadedClasses[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not load classes/students:", err);
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });

    return () => {
      active = false;
    };
  }, [open, user, selectedClassId]);

  if (!open) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const classLink = createdHomeworkId ? `${origin}/homework?h=${createdHomeworkId}` : "";

  const handleCreate = async () => {
    if (!user) return;
    if (targetType === "class" && !selectedClassId) {
      toast("Please select a class");
      return;
    }
    if (targetType === "students" && selectedStudentIds.length === 0) {
      toast("Please select at least one student");
      return;
    }

    try {
      setSubmitting(true);
      const res = await callCreateHomework({
        activityId: activity.id,
        targetType,
        classId: targetType === "class" ? selectedClassId : undefined,
        studentIds: targetType === "students" ? selectedStudentIds : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        instruction: instruction.trim() || undefined,
        allowLate,
      });

      setCreatedHomeworkId(res.homeworkId);
      setIndividualLinks(res.individualLinks || []);
      toast(strings.homework.createdSuccess);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create homework");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text: string, label: string = strings.homework.copied) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(label);
    } catch {
      toast("Could not copy to clipboard");
    }
  };

  const handleCopyAll = async () => {
    if (individualLinks.length === 0) return;
    const lines = individualLinks.map((l) => `${l.studentName}: ${origin}/homework?h=${createdHomeworkId}&s=${l.token}`);
    await handleCopy(lines.join("\n"), strings.homework.allCopied);
  };

  const handleShowQr = async (url: string, title: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
      setQrModalUrl(dataUrl);
      setQrModalTitle(title);
    } catch (err) {
      console.warn("Could not generate QR code:", err);
    }
  };

  const handleShareWhatsApp = (url: string) => {
    const text = `*${activity.title}* - Homework\n${instruction ? instruction + "\n" : ""}${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleRegenerateToken = async (studentId: string) => {
    if (!createdHomeworkId) return;
    if (!window.confirm(strings.homework.confirmRegenerateToken)) return;

    try {
      setRegeneratingStudentId(studentId);
      const res = await callRegenerateStudentHomeworkToken({
        homeworkId: createdHomeworkId,
        studentId,
      });

      setIndividualLinks((prev) =>
        prev.map((l) => (l.studentId === studentId ? { ...l, token: res.token } : l)),
      );
      toast(strings.homework.copied);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not regenerate link");
    } finally {
      setRegeneratingStudentId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border-subtle bg-elevated shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
              <BookOpen className="size-4" />
            </span>
            <div>
              <h2 id={`${modalId}-title`} className="font-display text-xl font-medium text-fg">
                {strings.homework.sendModalTitle}
              </h2>
              <p className="text-xs text-fg-secondary line-clamp-1">{activity.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-fg-secondary hover:bg-primary hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!createdHomeworkId ? (
            /* Creation Form */
            <div className="space-y-6">
              {/* Step 1: Destination selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-fg">
                  {strings.homework.destinationStep}
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setTargetType("class")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                      targetType === "class"
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border-subtle bg-primary text-fg-secondary hover:text-fg"
                    }`}
                  >
                    <Users className="size-4" />
                    <span>{strings.homework.targetClass}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("students")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                      targetType === "students"
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border-subtle bg-primary text-fg-secondary hover:text-fg"
                    }`}
                  >
                    <Users className="size-4" />
                    <span>{strings.homework.targetStudents}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("anyone")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                      targetType === "anyone"
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border-subtle bg-primary text-fg-secondary hover:text-fg"
                    }`}
                  >
                    <Share2 className="size-4" />
                    <span>{strings.homework.targetAnyone}</span>
                  </button>
                </div>
              </div>

              {/* Sub-selectors for Destination */}
              {targetType === "class" && (
                <div className="space-y-2">
                  <label htmlFor="hw-class-select" className="text-xs font-medium text-muted">
                    {strings.homework.selectClass}
                  </label>
                  {classes.length === 0 ? (
                    <p className="text-sm text-fg-secondary">
                      No active classes found. You can create a class in the Dashboard or choose
                      &quot;Anyone with the link&quot;.
                    </p>
                  ) : (
                    <select
                      id="hw-class-select"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full rounded-xl border border-border-subtle bg-primary px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.studentIds?.length || 0} students)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {targetType === "students" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted">
                    {strings.homework.selectStudents}
                  </label>
                  {students.length === 0 ? (
                    <p className="text-sm text-fg-secondary">No students registered yet.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border-subtle bg-primary p-3 space-y-1.5">
                      {students.map((s) => {
                        const checked = selectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-elevated text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIds((prev) => [...prev, s.id]);
                                } else {
                                  setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                                }
                              }}
                              className="size-4 rounded border-border-subtle text-accent accent-accent"
                            />
                            <span>{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Deadline & Late Policy */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="hw-due-date" className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Calendar className="size-3.5" />
                    <span>{strings.homework.dueDateLabel}</span>
                  </label>
                  <input
                    id="hw-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-primary px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                    <input
                      type="checkbox"
                      checked={allowLate}
                      onChange={(e) => setAllowLate(e.target.checked)}
                      className="size-4 rounded border-border-subtle text-accent accent-accent"
                    />
                    <span>{strings.homework.allowLateLabel}</span>
                  </label>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="hw-instruction" className="text-xs font-medium text-muted">
                    {strings.homework.instructionLabel}
                  </label>
                  <span className="text-xs text-muted">{instruction.length}/300</span>
                </div>
                <textarea
                  id="hw-instruction"
                  rows={3}
                  maxLength={300}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder={strings.homework.instructionPlaceholder}
                  className="w-full rounded-xl border border-border-subtle bg-primary p-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              {/* Submit button */}
              <div className="flex justify-end pt-2">
                <Button onClick={handleCreate} disabled={submitting || loadingInitial} className="px-6">
                  {submitting ? strings.homework.generating : strings.homework.generateButton}
                </Button>
              </div>
            </div>
          ) : (
            /* Created Result View (CA01, RF02) */
            <div className="space-y-6">
              {/* Class link / Universal link */}
              <div className="rounded-2xl border border-border-subtle bg-primary p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-fg">
                      {targetType === "anyone"
                        ? strings.homework.targetAnyone
                        : strings.homework.classLinkTitle}
                    </h3>
                    <p className="text-xs text-muted">
                      {targetType === "anyone"
                        ? "Anyone can open this link and enter their name."
                        : strings.homework.classLinkDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={classLink}
                    className="flex-1 rounded-xl border border-border-subtle bg-elevated px-3 py-2 text-xs font-mono text-fg select-all"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(classLink)}
                    className="h-9 px-3 text-xs"
                    title={strings.homework.copyLink}
                  >
                    <Copy className="size-3.5" />
                    <span>{strings.homework.copyLink}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleShowQr(classLink, activity.title)}
                    className="h-9 px-2 text-xs"
                    title={strings.homework.qrCode}
                  >
                    <QrCode className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleShareWhatsApp(classLink)}
                    className="h-9 px-2 text-xs text-green-500 hover:text-green-400"
                    title={strings.homework.whatsappShare}
                  >
                    <Share2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Individual Student Links (RF02, CA01) */}
              {individualLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-fg">
                        {strings.homework.individualLinksTitle}
                      </h3>
                      <p className="text-xs text-muted">
                        {strings.homework.individualLinksDesc}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleCopyAll}
                      className="h-8 px-3 text-xs font-medium"
                    >
                      <Copy className="size-3.5" />
                      <span>{strings.homework.copyAll}</span>
                    </Button>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-primary">
                    {individualLinks.map((linkItem) => {
                      const personalUrl = `${origin}/homework?h=${createdHomeworkId}&s=${linkItem.token}`;
                      const isRegenerating = regeneratingStudentId === linkItem.studentId;

                      return (
                        <div
                          key={linkItem.studentId}
                          className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-elevated/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-fg truncate">{linkItem.studentName}</p>
                            <p className="text-[11px] font-mono text-muted truncate">{personalUrl}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="ghost"
                              onClick={() => handleCopy(personalUrl)}
                              className="h-8 px-2 text-xs"
                              title={strings.homework.copyLink}
                            >
                              <Copy className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleShowQr(
                                  personalUrl,
                                  `${linkItem.studentName} - ${activity.title}`,
                                )
                              }
                              className="h-8 px-2 text-xs"
                              title={strings.homework.qrCode}
                            >
                              <QrCode className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleShareWhatsApp(personalUrl)}
                              className="h-8 px-2 text-xs text-green-500 hover:text-green-400"
                              title={strings.homework.whatsappShare}
                            >
                              <Share2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleRegenerateToken(linkItem.studentId)}
                              disabled={isRegenerating}
                              className="h-8 px-2 text-xs text-muted hover:text-fg"
                              title={strings.homework.regenerateLink}
                            >
                              <RefreshCw
                                className={`size-3.5 ${isRegenerating ? "animate-spin" : ""}`}
                              />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={onClose} variant="secondary" className="px-6">
                  {strings.classes.closeModal}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Lightbox Modal */}
      {qrModalUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="relative flex flex-col items-center gap-4 rounded-3xl border border-border-subtle bg-elevated p-6 text-center shadow-2xl">
            <h3 className="font-display text-lg font-medium text-fg">{qrModalTitle}</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrModalUrl}
              alt="Homework QR Code"
              className="size-64 rounded-2xl border border-border-subtle bg-white p-2"
            />
            <Button variant="secondary" onClick={() => setQrModalUrl(null)}>
              {strings.classes.closeModal}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
