"use client";

import {
  Check,
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  LogIn,
  Radio,
  Sparkles,
  Trophy,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/live/code";
import {
  joinLiveRoom,
  subscribeLiveRoom,
  subscribeServerTimeOffset,
  submitLiveAnswer,
} from "@/lib/live/repository";
import { computeLeaderboard } from "@/lib/live/scoring";
import type { LiveParticipant, LiveRoom, LiveRoomMode } from "@/lib/live/types";
import { InteractiveWhiteboard } from "./interactive-whiteboard";
import { LiveSentenceBuilder } from "./live-sentence-builder";

export interface StudentLiveViewProps {
  initialCode?: string;
}

export function StudentLiveView({ initialCode = "" }: StudentLiveViewProps) {
  const { user } = useAuth();

  // State machine for student screen
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Join form states
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [pinInput, setPinInput] = useState<string>("");
  const [guestNameInput, setGuestNameInput] = useState<string>("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Active student participant session
  const [participant, setParticipant] = useState<LiveParticipant | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  // Answer submission states
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  const studentSelectId = useId();
  const pinInputId = useId();
  const guestNameId = useId();

  // Subscribe to server time offset
  useEffect(() => {
    const unsub = subscribeServerTimeOffset((offset) => setServerOffsetMs(offset));
    return () => unsub();
  }, []);

  // Fetch or subscribe to room once code is valid
  useEffect(() => {
    if (!code || !isValidRoomCode(code)) {
      setRoom(null);
      return;
    }

    setIsLoadingRoom(true);
    setRoomError(null);

    const unsub = subscribeLiveRoom(code, (updatedRoom) => {
      setIsLoadingRoom(false);
      if (!updatedRoom) {
        setRoomError("Class not found. Check the 6-character code.");
        setRoom(null);
        return;
      }

      setRoom(updatedRoom);

      // Check if current participant was kicked or disconnected
      if (participant) {
        const currentP = updatedRoom.participants?.[participant.uid];
        if (currentP) {
          if ((currentP as any).kicked) {
            setIsKicked(true);
          }
          setParticipant(currentP);
        }
      }
    });

    return () => unsub();
  }, [code, participant?.uid]);

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer("");
    setAnswerSubmitted(false);
  }, [room?.state?.itemIndex, room?.state?.mode]);

  // Check if current user already submitted answer for this question
  useEffect(() => {
    if (!room || !participant) return;
    const currentItemIndex = room.state.itemIndex ?? 0;
    const userAns = room.answers?.[currentItemIndex]?.[participant.uid];
    if (userAns) {
      setSelectedAnswer(userAns.value);
      setAnswerSubmitted(true);
    }
  }, [room, participant]);

  // Handle Join Submission (CA02, CA03, CA10, CA14)
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setIsJoining(true);

    try {
      const isGuestMode = !selectedStudentId;
      const rosterStudent = selectedStudentId && room?.roster?.[selectedStudentId];

      const res = await joinLiveRoom({
        code,
        name: isGuestMode ? guestNameInput.trim() : rosterStudent ? rosterStudent.fullName : "",
        studentId: selectedStudentId || undefined,
        pin: pinInput.trim() || undefined,
        portalUid: user?.uid,
        isGuest: isGuestMode,
      });

      if (!res.success) {
        if (res.error === "WRONG_PIN") {
          setJoinError("Wrong PIN. Please try again.");
        } else if (res.error === "LOCKED") {
          setJoinError("This class is locked by the teacher.");
        } else if (res.error === "FULL") {
          setJoinError("This class is full (maximum 40 students).");
        } else if (res.error === "GUESTS_DISABLED") {
          setJoinError("Ask your teacher for access. Guest entry is disabled.");
        } else {
          setJoinError("Unable to join. Please check your credentials.");
        }
        return;
      }

      setParticipant(res.participant);
    } catch (err: any) {
      setJoinError(err?.message || "Failed to join room.");
    } finally {
      setIsJoining(false);
    }
  };

  // Submit Answer to current question (CA05, CA06, CA12)
  const handleAnswer = async (value: string) => {
    if (!room || !participant || answerSubmitted || isSubmittingAnswer) return;
    if (room.state.revealed) return; // Disallow submissions after reveal

    setIsSubmittingAnswer(true);
    setSelectedAnswer(value);

    try {
      const itemIndex = room.state.itemIndex ?? 0;
      const res = await submitLiveAnswer({
        code,
        itemIndex,
        value,
      });

      if (res.success) {
        setAnswerSubmitted(true);
      } else {
        setJoinError(res.error || "Failed to submit answer");
      }
    } catch (e: any) {
      console.warn("Answer submission error:", e);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // 1. Kicked State (CA04)
  if (isKicked) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background select-none">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-500 mb-4">
          <XCircle className="size-8" />
        </div>
        <h1 className="font-display text-xl font-bold text-fg">
          You were removed from the class
        </h1>
        <p className="mt-2 text-xs text-muted max-w-xs">
          The teacher has removed your device from this live session.
        </p>
      </main>
    );
  }

  // 2. Initial Code Entry Screen (if no code or invalid code)
  if (!code || !isValidRoomCode(code) || !room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background select-none">
        <div className="w-full max-w-sm space-y-6 rounded-3xl border border-border-subtle bg-elevated p-6 shadow-xl text-center">
          <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Radio className="size-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-fg">Fun English Live</h1>
            <p className="text-xs text-muted">
              Enter the 6-character room code from your teacher's screen
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("roomCode") as HTMLInputElement)?.value;
              if (input) setCode(normalizeRoomCode(input));
            }}
            className="space-y-4"
          >
            <input
              name="roomCode"
              type="text"
              maxLength={6}
              defaultValue={code}
              placeholder="e.g. K7P9X2"
              autoFocus
              className="w-full rounded-2xl border-2 border-border-strong bg-primary/30 p-3.5 text-center font-mono text-2xl font-black uppercase tracking-widest text-fg placeholder:text-muted focus:border-accent focus:outline-hidden"
              required
            />

            {roomError && (
              <p role="alert" className="text-xs font-semibold text-error">
                {roomError}
              </p>
            )}

            <Button type="submit" disabled={isLoadingRoom} className="w-full min-h-12 text-sm font-bold">
              {isLoadingRoom ? "Connecting…" : "Next"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Identification Screen (Choose Name + PIN, or Guest) (CA02, CA03)
  if (!participant) {
    const rosterList = Object.values(room.roster || {});
    const allowsGuests = room.allowGuests;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background select-none">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border-subtle bg-elevated p-6 shadow-xl">
          <div className="text-center space-y-1">
            <Badge variant="outline" className="font-mono text-xs font-bold text-accent">
              ROOM: {room.code}
            </Badge>
            <h1 className="font-display text-2xl font-bold text-fg">{room.className}</h1>
            <p className="text-xs text-muted">Select your name to join the class</p>
          </div>

          {room.locked && (
            <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-500 font-medium">
              This class is locked. Ask your teacher to unlock it.
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Student selection dropdown */}
            {rosterList.length > 0 && (
              <div className="space-y-1.5 text-left">
                <label htmlFor={studentSelectId} className="text-xs font-semibold text-fg">
                  Your name:
                </label>
                <select
                  id={studentSelectId}
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setJoinError(null);
                  }}
                  className="w-full rounded-2xl border border-border-strong bg-primary/40 p-3 text-sm font-medium text-fg focus:border-accent focus:outline-hidden"
                >
                  <option value="">
                    {allowsGuests ? "-- Or join as guest --" : "-- Select your name --"}
                  </option>
                  {rosterList.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* PIN input (required when selecting a roster student) */}
            {selectedStudentId ? (
              <div className="space-y-1.5 text-left">
                <label htmlFor={pinInputId} className="text-xs font-semibold text-fg">
                  Your 4-digit PIN:
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 size-4 text-muted" />
                  <input
                    id={pinInputId}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    className="w-full rounded-2xl border border-border-strong bg-primary/40 pl-10 pr-4 py-3 font-mono text-base tracking-widest text-fg placeholder:text-muted focus:border-accent focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            ) : allowsGuests ? (
              /* Guest Name Input (RF02) */
              <div className="space-y-1.5 text-left">
                <label htmlFor={guestNameId} className="text-xs font-semibold text-fg">
                  Guest Name:
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 size-4 text-muted" />
                  <input
                    id={guestNameId}
                    type="text"
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                    placeholder="Enter your first name"
                    className="w-full rounded-2xl border border-border-strong bg-primary/40 pl-10 pr-4 py-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted italic text-center">
                Please select your name above to enter your PIN.
              </p>
            )}

            {joinError && (
              <p role="alert" className="text-xs font-semibold text-error text-center">
                {joinError}
              </p>
            )}

            <Button
              type="submit"
              disabled={isJoining || room.locked || (!selectedStudentId && !guestNameInput.trim())}
              className="w-full min-h-12 text-sm font-bold"
            >
              {isJoining ? "Entering class…" : "Join Class"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // 4. CLASSROOM PARTICIPATING STATES (Lobby, Activity, Presentation, Tools, Ended)
  const currentItemIndex = room.state.itemIndex ?? 0;
  const isRevealed = Boolean(room.state.revealed);
  const userAns = room.answers?.[currentItemIndex]?.[participant.uid];
  const isAnswerCorrect = userAns ? Boolean(userAns.correct) : undefined;
  const userScore = participant.score || 0;

  const { top: leaderboard, userRank } = computeLeaderboard(
    room.participants || {},
    participant.uid,
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-fg select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-elevated/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-success animate-pulse" />
          <span className="font-display text-sm font-bold text-fg truncate max-w-40">
            {room.className}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
            <Trophy className="size-3.5" />
            <span>{userScore} pts</span>
          </div>
          <span className="text-xs font-medium text-muted truncate max-w-25">
            {participant.name}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {/* A. LOBBY (RF03, CA02) */}
        {room.state.mode === "lobby" && (
          <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in-50 duration-300">
            <div className="relative mx-auto flex size-24 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Sparkles className="size-10 animate-bounce" />
              <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-fg">
                Waiting for your teacher…
              </h2>
              <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                You're in! When the teacher starts an activity, questions and tools will appear right
                here.
              </p>
            </div>

            {/* Individual score banner */}
            <div className="rounded-2xl border border-border-subtle bg-primary/20 p-4">
              <span className="text-xs text-muted">Your current score</span>
              <div className="font-mono text-3xl font-extrabold text-accent">{userScore}</div>
            </div>
          </div>
        )}

        {/* B. PRESENTATION MODE (RF07, CA08) */}
        {room.state.mode === "presentation" && (
          <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in-50 duration-300">
            <div className="mx-auto flex size-24 items-center justify-center rounded-3xl bg-accent/20 text-accent">
              <Eye className="size-12 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-fg">
                Look at your teacher's screen 👀
              </h2>
              <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                Your teacher is presenting cards or slides on the video call. Follow along there!
              </p>
            </div>
          </div>
        )}

        {/* C. ACTIVITY MODE (Quiz or Fill-in-blanks) (RF04, RF06, CA05, CA06) */}
        {room.state.mode === "activity" && room.state.question && (
          <div className="w-full max-w-md space-y-5 animate-in fade-in-50 duration-200">
            {/* Question Counter */}
            <div className="flex items-center justify-between text-xs font-semibold text-muted uppercase tracking-wider">
              <span>
                Question {(room.state.itemIndex ?? 0) + 1}
                {room.state.totalItems ? ` of ${room.state.totalItems}` : ""}
              </span>
              {isRevealed ? (
                <span className="text-accent font-bold">Answer Revealed</span>
              ) : answerSubmitted ? (
                <span className="text-success font-bold">Answer Submitted</span>
              ) : (
                <span className="text-fg-secondary">Tap your answer</span>
              )}
            </div>

            {/* Question Prompt */}
            <div className="rounded-3xl border border-border-subtle bg-elevated p-5 shadow-sm text-center">
              <h3 className="text-base sm:text-lg font-bold text-fg leading-snug">
                {room.state.question.prompt}
              </h3>
            </div>

            {/* Quiz Choices (min 48px touch targets, RNF10) */}
            {room.state.question.options && room.state.question.options.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {room.state.question.options.map((opt, idx) => {
                  const isChosen = selectedAnswer === opt.text;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answerSubmitted || isRevealed}
                      onClick={() => handleAnswer(opt.text)}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                        isChosen
                          ? "border-accent bg-accent/20 text-accent font-bold shadow-md"
                          : "border-border-strong bg-primary/30 text-fg hover:border-accent hover:bg-primary/50"
                      } ${answerSubmitted && !isChosen ? "opacity-50" : ""}`}
                    >
                      <span className="text-sm leading-tight">{opt.text}</span>
                      {isChosen && <Check className="size-5 shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fill-in-the-blanks input */}
            {room.state.activityType === "fill-blanks" && !room.state.question.options && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = (e.currentTarget.elements.namedItem("blankAnswer") as HTMLInputElement)?.value;
                  if (val) handleAnswer(val);
                }}
                className="space-y-3"
              >
                <input
                  name="blankAnswer"
                  type="text"
                  disabled={answerSubmitted || isRevealed}
                  defaultValue={selectedAnswer}
                  placeholder="Type your answer here…"
                  className="w-full min-h-14 rounded-2xl border-2 border-border-strong bg-primary/40 px-4 text-center text-lg font-semibold text-fg placeholder:text-muted focus:border-accent focus:outline-hidden"
                  required
                />
                {!answerSubmitted && !isRevealed && (
                  <Button type="submit" className="w-full min-h-12 text-sm font-bold">
                    Submit Answer
                  </Button>
                )}
              </form>
            )}

            {/* Sentence Builder (spec 15, RF07) */}
            {room.state.activityType === "sentence-order" && room.state.question.chunks && (
              <LiveSentenceBuilder
                key={room.state.itemIndex ?? 0}
                chunks={room.state.question.chunks}
                punctuation={room.state.question.punctuation}
                disabled={answerSubmitted || isRevealed}
                onSubmit={handleAnswer}
              />
            )}

            {/* Answer Feedback after Reveal (CA06) */}
            {isRevealed && (
              <div
                role="alert"
                className={`rounded-3xl border p-5 text-center shadow-lg animate-in zoom-in-95 duration-200 ${
                  isAnswerCorrect
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-neutral-700 bg-neutral-800 text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isAnswerCorrect ? (
                    <>
                      <CheckCircle2 className="size-6 text-success" />
                      <span className="font-display text-xl font-bold">Correct! 🎉</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-6 text-neutral-400" />
                      <span className="font-display text-xl font-bold">Not quite 😕</span>
                    </>
                  )}
                </div>

                {userAns?.pointsAwarded ? (
                  <p className="font-mono text-sm font-extrabold text-accent">
                    +{userAns.pointsAwarded} points
                  </p>
                ) : null}

                {room.state.question.explanation && (
                  <p className="mt-2 text-xs text-neutral-300 leading-relaxed border-t border-white/10 pt-2">
                    {room.state.question.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Leaderboard or Personal Score (RF05, CA07) */}
            {isRevealed && (
              <div className="rounded-2xl border border-border-subtle bg-primary/10 p-3.5 space-y-2">
                {!room.hideLeaderboard ? (
                  <>
                    <div className="flex items-center justify-between text-xs font-semibold text-fg">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="size-3.5 text-accent" />
                        Top 5 Leaderboard
                      </span>
                      {userRank && (
                        <span className="text-[11px] text-muted">
                          Your rank: #{userRank.rank}
                        </span>
                      )}
                    </div>
                    <ol className="space-y-1">
                      {leaderboard.map((item) => (
                        <li
                          key={item.uid}
                          className={`flex items-center justify-between rounded-xl px-2.5 py-1 text-xs ${
                            item.isCurrentUser
                              ? "bg-accent/20 font-bold text-accent"
                              : "bg-primary/20 text-fg"
                          }`}
                        >
                          <span>
                            #{item.rank} {item.name}
                          </span>
                          <span className="font-mono">{item.score} pts</span>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <div className="text-center text-xs text-muted">
                    Your current score:{" "}
                    <span className="font-mono font-bold text-accent">{userScore} pts</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* D. MIRRORED TIMER (RF09, CA09) */}
        {room.state.mode === "tool_timer" && room.state.timer && (
          <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in-50 duration-200">
            <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Clock className="size-7" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-fg">Classroom Timer</h2>
              <p className="text-xs text-muted">Synchronized with your teacher</p>
            </div>

            <MirroredTimerDisplay
              timerState={room.state.timer}
              serverOffsetMs={serverOffsetMs}
            />
          </div>
        )}

        {/* E. MIRRORED PICKER (RF09, CA09) */}
        {room.state.mode === "tool_picker" && room.state.picked && (
          <div className="w-full max-w-sm space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="flex size-20 mx-auto items-center justify-center rounded-3xl bg-accent/20 text-accent animate-bounce">
              <Sparkles className="size-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Student Selected!
              </span>
              <div className="font-display text-3xl sm:text-4xl font-black text-accent">
                {room.state.picked.name}
              </div>
            </div>
          </div>
        )}

        {/* F. MIRRORED BOARD (RF09, CA09) */}
        {room.state.mode === "tool_board" && (
          <div className="w-full max-w-lg space-y-4 text-center animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider">
                Teacher's Whiteboard
              </h3>
              <Badge variant="outline" className="text-[10px]">
                View Only
              </Badge>
            </div>

            <div className="flex min-h-75 w-full flex-col items-center justify-center rounded-3xl border border-border-subtle bg-primary/20 p-6 text-center">
              <p className="text-xs font-medium text-fg">
                {room.state.board?.text || "Whiteboard is currently mirrored on your screen."}
              </p>
            </div>
          </div>
        )}

        {/* G. CLASS ENDED (RF12, CA11) */}
        {room.state.mode === "ended" && (
          <div className="w-full max-w-sm space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="flex size-20 mx-auto items-center justify-center rounded-3xl bg-accent/20 text-accent">
              <Trophy className="size-10" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-fg">
                Class ended — thanks! 🎉
              </h2>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Great job in today's class! Your results were saved to your class record.
              </p>
            </div>

            <div className="rounded-3xl border border-border-subtle bg-elevated p-6 shadow-sm space-y-2">
              <span className="text-xs text-muted">Your Final Score</span>
              <div className="font-mono text-4xl font-extrabold text-accent">{userScore} pts</div>
            </div>
          </div>
        )}
      </main>

      {/* H. INTERACTIVE WHITEBOARD (RF03, CA04) */}
      {room.state.mode === "whiteboard" && (
        <InteractiveWhiteboard
          roomCode={room.code}
          isTeacher={false}
        />
      )}
    </div>
  );
}

/**
 * Synchronized Countdown Timer Display for Student Devices (RF09, RNF06, CA09)
 */
function MirroredTimerDisplay({
  timerState,
  serverOffsetMs,
}: {
  timerState: { endsAt: number; durationSec: number; pausedRemaining?: number; running: boolean };
  serverOffsetMs: number;
}) {
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (!timerState.running) return timerState.pausedRemaining ?? timerState.durationSec;
    const nowServer = Date.now() + serverOffsetMs;
    return Math.max(0, Math.ceil((timerState.endsAt - nowServer) / 1000));
  });

  useEffect(() => {
    if (!timerState.running) {
      setRemainingSec(timerState.pausedRemaining ?? timerState.durationSec);
      return;
    }

    const interval = setInterval(() => {
      const nowServer = Date.now() + serverOffsetMs;
      const left = Math.max(0, Math.ceil((timerState.endsAt - nowServer) / 1000));
      setRemainingSec(left);
    }, 200);

    return () => clearInterval(interval);
  }, [timerState, serverOffsetMs]);

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const isTimesUp = remainingSec <= 0 && timerState.running;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-border-subtle bg-elevated p-8 shadow-sm">
      <span
        className={`font-mono text-6xl font-black tabular-nums transition-colors ${
          isTimesUp
            ? "text-red-500 animate-bounce"
            : remainingSec <= 10
              ? "text-red-500 animate-pulse"
              : "text-fg"
        }`}
      >
        {isTimesUp ? "00:00" : timeFormatted}
      </span>
      {isTimesUp && (
        <span className="mt-2 text-sm font-bold uppercase tracking-wider text-red-500">
          Time's up!
        </span>
      )}
    </div>
  );
}
