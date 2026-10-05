"use client";

import { AlertCircle, BookOpen, Calendar, CheckCircle2, Lock, Play, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActivityPlayer } from "@/components/player/activity-player";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/use-auth";
import {
  callGetHomeworkForStudent,
  callSubmitHomework,
  callVerifyStudentPin,
  type GetHomeworkForStudentResponse,
} from "@/lib/functions";
import type { ActivityResult } from "@/lib/player/types";
import { strings } from "@/lib/strings";

type StudentStep = "identifying" | "ready" | "playing" | "done";

export function HomeworkPageClient() {
  const searchParams = useSearchParams();
  const homeworkId = searchParams.get("h") || "";
  const studentToken = searchParams.get("s") || undefined;

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GetHomeworkForStudentResponse | null>(null);

  // Identity state
  const [step, setStep] = useState<StudentStep>("identifying");
  const [via, setVia] = useState<"token" | "pin" | "portal" | "anonymous">("anonymous");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [anonymousName, setAnonymousName] = useState<string>("");
  const [identifyingError, setIdentifyingError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Submission state
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "submitting" | "success" | "max-attempts" | "error"
  >("idle");
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

  // 1. Fetch homework details
  useEffect(() => {
    if (!homeworkId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    callGetHomeworkForStudent({ homeworkId, studentToken })
      .then((res) => {
        if (!active) return;
        setData(res);

        if (!res.valid || res.isClosed) {
          setStep("identifying");
          return;
        }

        // Automatic identification via token (CA02)
        if (studentToken && res.student) {
          setVia("token");
          setSelectedStudentId(res.student.studentId);
          setSelectedStudentName(res.student.firstName);
          setStep("ready");
          return;
        }

        // Automatic identification via portal login if student (CA03)
        if (user && user.role === "student") {
          setVia("portal");
          setSelectedStudentName(user.displayName || "Student");
          setStep("ready");
          return;
        }

        // Otherwise requires PIN or name entry
        setStep("identifying");
      })
      .catch((err) => {
        if (!active) return;
        console.warn("Could not load homework:", err);
        setData({ valid: false, error: err instanceof Error ? err.message : "Load error" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [homeworkId, studentToken, user]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center p-6 space-y-6">
        <Skeleton className="h-12 w-48 rounded-full" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  // Error / Invalid Link (CA10)
  if (!homeworkId || !data || !data.valid) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 sm:p-12 space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-fg">
            {strings.homework.invalidLinkTitle}
          </h1>
          <p className="text-sm text-fg-secondary">
            {strings.homework.invalidLinkDesc}
          </p>
        </div>
      </div>
    );
  }

  // Closed Homework (CA06)
  if (data.isClosed) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <div className="rounded-3xl border border-border-subtle bg-elevated p-8 sm:p-12 space-y-4 shadow-lg">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Lock className="size-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-fg">
            {strings.homework.closedTitle}
          </h1>
          <p className="text-sm text-fg-secondary">
            {strings.homework.closedDesc}
          </p>
        </div>
      </div>
    );
  }

  const hw = data.homework!;

  // Handle PIN verification for class link (CA11, CA13)
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setIdentifyingError(strings.homework.selectYourName);
      return;
    }
    if (!pin.trim()) {
      setIdentifyingError(strings.homework.enterPin);
      return;
    }

    try {
      setVerifyingPin(true);
      setIdentifyingError(null);
      const res = await callVerifyStudentPin({
        studentId: selectedStudentId,
        pin: pin.trim(),
      });

      if (res.success) {
        setVia("pin");
        const found = hw.classRoster?.find((r) => r.studentId === selectedStudentId);
        setSelectedStudentName(res.studentName || found?.firstName || "Student");
        setStep("ready");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Too many attempts")) {
        setIdentifyingError(strings.homework.tooManyAttempts);
      } else {
        setIdentifyingError(strings.homework.wrongPin);
      }
    } finally {
      setVerifyingPin(false);
    }
  };

  // Handle anonymous start
  const handleStartAnonymous = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anonymousName.trim()) {
      setIdentifyingError(strings.homework.enterYourName);
      return;
    }
    setVia("anonymous");
    setSelectedStudentName(anonymousName.trim());
    setStep("ready");
  };

  // Submission handler on game complete (RF05, CA04, CA07, CA08, RNF04)
  const handleActivityComplete = async (result: ActivityResult, seconds: number) => {
    try {
      setSubmissionStatus("submitting");

      const res = await callSubmitHomework({
        homeworkId,
        via,
        studentToken,
        studentId: selectedStudentId || undefined,
        studentPin: via === "pin" ? pin : undefined,
        studentName: selectedStudentName,
        seconds,
        answers: (result as any).rawAnswers || [],
      });

      if (res.success) {
        setSubmissionStatus("success");
        setSubmissionMessage(strings.homework.sentToTeacher);
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("all 3 attempts")) {
        setSubmissionStatus("max-attempts");
        setSubmissionMessage(strings.homework.usedAttemptsTitle);
      } else {
        setSubmissionStatus("error");
        setSubmissionMessage(msg || "Could not send results to teacher");
      }
    }
  };

  // Ready Screen: "Hi, Ana!" before clicking Start
  if (step === "ready") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <div className="w-full rounded-3xl border border-border-subtle bg-elevated p-8 sm:p-10 space-y-6 shadow-xl">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-medium text-fg">
              {strings.homework.greeting(selectedStudentName)}
            </h1>
            <p className="text-xl font-medium text-accent">{hw.activityTitle}</p>
          </div>

          {hw.instruction && (
            <div className="rounded-2xl border border-border-subtle bg-primary p-4 text-sm text-fg-secondary text-left space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Teacher&apos;s note:
              </span>
              <p>{hw.instruction}</p>
            </div>
          )}

          {hw.dueDate && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <Calendar className="size-3.5" />
              <span>Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
            </div>
          )}

          <Button
            onClick={() => setStep("playing")}
            className="w-full min-h-12 text-base font-medium"
            autoFocus
          >
            <Play className="size-5" />
            <span>{strings.homework.startHomework}</span>
          </Button>
        </div>
      </div>
    );
  }

  // Identification Form (if not pre-identified via token or portal)
  if (step === "identifying") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <div className="w-full rounded-3xl border border-border-subtle bg-elevated p-8 sm:p-10 space-y-6 shadow-xl text-left">
          <div className="text-center space-y-2">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent-muted text-accent">
              <BookOpen className="size-5" />
            </span>
            <h1 className="font-display text-3xl font-medium text-fg">{hw.activityTitle}</h1>
            {hw.instruction && (
              <p className="text-sm text-fg-secondary italic">&ldquo;{hw.instruction}&rdquo;</p>
            )}
          </div>

          {identifyingError && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{identifyingError}</span>
            </div>
          )}

          {hw.targetType === "class" && hw.classRoster && (
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="hw-student-select" className="text-xs font-medium text-muted">
                  {strings.homework.selectYourName}
                </label>
                <select
                  id="hw-student-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-primary px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">{strings.homework.selectYourName}...</option>
                  {hw.classRoster.map((r) => (
                    <option key={r.studentId} value={r.studentId}>
                      {r.firstName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="hw-pin-input" className="text-xs font-medium text-muted">
                  {strings.homework.enterPin}
                </label>
                <input
                  id="hw-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={strings.homework.pinPlaceholder}
                  className="w-full tracking-widest text-center font-mono rounded-xl border border-border-subtle bg-primary px-3 py-2.5 text-lg text-fg focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={verifyingPin}
                className="w-full min-h-11 text-base font-medium"
              >
                {verifyingPin ? "Checking PIN..." : strings.homework.startHomework}
              </Button>
            </form>
          )}

          {hw.targetType === "anyone" && (
            <form onSubmit={handleStartAnonymous} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="hw-anon-name" className="text-xs font-medium text-muted">
                  {strings.homework.enterYourName}
                </label>
                <input
                  id="hw-anon-name"
                  type="text"
                  value={anonymousName}
                  onChange={(e) => setAnonymousName(e.target.value)}
                  placeholder={strings.homework.namePlaceholder}
                  className="w-full rounded-xl border border-border-subtle bg-primary px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <Button type="submit" className="w-full min-h-11 text-base font-medium">
                {strings.homework.startHomework}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Active activity player
  const playableActivity: any = {
    id: hw.activityId,
    title: hw.activityTitle,
    slug: hw.activitySlug,
    type: hw.activityType,
    category: "grammar",
    levelMin: "A1",
    levelMax: "C2",
    description: hw.instruction || "",
    content: data.activityContent,
  };

  return (
    <div className="flex min-h-screen flex-col bg-primary">
      {/* Top compact student bar */}
      <header className="border-b border-border-subtle bg-secondary/80 px-4 py-2.5">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-fg text-sm sm:text-base">
              {hw.activityTitle}
            </span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Homework
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-fg-secondary">
            <User className="size-3.5" />
            <span className="font-medium text-fg">{selectedStudentName}</span>
          </div>
        </div>
      </header>

      {/* Main Player Engine (RNF05) */}
      <main className="flex flex-1 flex-col">
        <ActivityPlayer
          activity={playableActivity}
          onCompleteResult={handleActivityComplete}
          homeworkMessage={
            submissionStatus === "submitting" ? (
              <span className="animate-pulse">Sending results to teacher…</span>
            ) : submissionStatus === "success" ? (
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-4" />
                <span>{strings.homework.sentToTeacher}</span>
              </span>
            ) : submissionStatus === "max-attempts" ? (
              <span className="text-amber-500 font-medium">
                {strings.homework.usedAttemptsTitle}
              </span>
            ) : submissionStatus === "error" ? (
              <span className="text-destructive font-medium">{submissionMessage}</span>
            ) : null
          }
        />
      </main>
    </div>
  );
}
