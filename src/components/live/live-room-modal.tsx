"use client";

import { Check, Copy, Lock, Radio, Share2, Unlock, UserX, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { generateInviteText } from "@/lib/live/code";
import { useLiveRoom } from "@/lib/live/live-context";
import { useClasses } from "@/lib/classes/use-classes";
import { useSessionContext } from "@/lib/session/session-context";

export function LiveRoomModal() {
  const live = useLiveRoom();
  const session = useSessionContext();
  const { students } = useClasses();

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const activeSession = session?.activeSession;
  const room = live?.liveRoom;
  const isLive = live?.isLiveActive;
  const isOpen = live?.isModalOpen;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const roomUrl = room ? `${origin}/live?code=${room.code}` : "";

  // Generate QR Code data URL when room code is available
  useEffect(() => {
    if (!roomUrl) return;
    QRCode.toDataURL(roomUrl, { width: 220, margin: 2 })
      .then(setQrDataUrl)
      .catch((err) => console.warn("Failed generating QR code:", err));
  }, [roomUrl]);

  if (!isOpen || !live) return null;

  const handleStartRoom = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      // In a class: that class (or student). From the standalone whiteboard, with no class started:
      // every student of the teacher, plus guests (SDD/2026-10-06_sala-ao-vivo-sem-aula.md).
      const classStudents = activeSession
        ? students.filter(
            (s) =>
              (activeSession.classId && s.classIds.includes(activeSession.classId)) ||
              (activeSession.studentId && s.id === activeSession.studentId),
          )
        : students;
      const roster = classStudents.map((s) => ({
        studentId: s.id,
        firstName: s.name.split(" ")[0],
        fullName: s.name,
        portalUid: s.portalUid,
      }));

      const studentPins: Record<string, string> = {};
      for (const s of classStudents) {
        if (s.homeworkPin) {
          studentPins[s.id] = s.homeworkPin;
        }
      }

      await live.startRoom({
        sessionId: activeSession?.id ?? "",
        className: activeSession
          ? activeSession.className || classStudents[0]?.name || "Individual Lesson"
          : "Whiteboard",
        roster,
        studentPins,
        allowGuests: !activeSession,
      });
    } catch (e) {
      console.error("Failed to start live room:", e);
      setStartError("Couldn't open the live room. Try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCopyLink = () => {
    if (!roomUrl) return;
    navigator.clipboard.writeText(roomUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyInvite = () => {
    if (!room) return;
    const invite = generateInviteText(room.code, origin);
    navigator.clipboard.writeText(invite);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const participantsList = Object.values(room?.participants || {});
  const onlineCount = participantsList.filter((p) => p.online !== false).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Room Manager"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border-subtle bg-elevated shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 bg-primary/20">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-accent/20 text-accent">
              <Radio className="size-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-fg">Live Room</h2>
              <p className="text-xs text-muted">
                {activeSession?.className || "Active Classroom Session"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={live.closeModal}
            className="rounded-xl p-2 text-fg-secondary hover:bg-primary/30 hover:text-fg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isLive || !room ? (
            /* Open Live Room Welcome State */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-3xl bg-accent/10 text-accent">
                <Users className="size-8" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="font-display text-xl font-bold text-fg">
                  {activeSession
                    ? "Open live room for this class"
                    : "Open a live room for the whiteboard"}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Students join on their own phones or computers with a 6-character code or link to
                  answer quizzes and see synchronized tools.
                </p>
              </div>

              <Button
                onClick={handleStartRoom}
                disabled={isStarting}
                className="mt-2 min-h-11 px-8 text-sm font-semibold"
              >
                {isStarting ? "Opening room…" : "Open live room"}
              </Button>
              {startError && (
                <p role="alert" className="text-xs font-medium text-error">
                  {startError}
                </p>
              )}
            </div>
          ) : (
            /* Active Live Room State (RF01, RF03, CA01, CA04) */
            <div className="space-y-6">
              {/* Room Code & Invite Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-border-subtle bg-primary/20 p-5">
                {/* QR Code */}
                {qrDataUrl && (
                  <div className="flex shrink-0 flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={`QR code for live room ${room.code}`}
                      className="size-36"
                    />
                    <span className="text-[10px] font-bold text-neutral-800">Scan to join</span>
                  </div>
                )}

                <div className="flex flex-1 flex-col items-center sm:items-start text-center sm:text-left gap-3">
                  <div>
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">
                      Room Code
                    </span>
                    <div className="font-mono text-4xl font-extrabold tracking-widest text-accent">
                      {room.code}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleCopyInvite}
                      className="min-h-9 px-3.5 text-xs font-semibold"
                    >
                      {copiedInvite ? (
                        <>
                          <Check className="size-3.5 text-success" />
                          <span>Copied invite!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy invite</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleCopyLink}
                      className="min-h-9 px-3 text-xs"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="size-3.5 text-success" />
                          <span>Copied link!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="size-3.5" />
                          <span>Copy link</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Room Controls (Lock, Guests, Leaderboard) */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-subtle bg-primary/10 p-3 text-xs">
                {/* Lock Room Toggle (RF03, CA04) */}
                <button
                  type="button"
                  onClick={live.toggleLock}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition-colors ${
                    room.locked
                      ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                      : "bg-primary/40 text-fg-secondary hover:text-fg"
                  }`}
                >
                  {room.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                  <span>{room.locked ? "Room locked" : "Lock room"}</span>
                </button>

                {/* Allow Guests Toggle (RF02) */}
                <button
                  type="button"
                  onClick={live.toggleGuests}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition-colors ${
                    room.allowGuests
                      ? "bg-accent/20 text-accent font-semibold"
                      : "bg-primary/40 text-fg-secondary hover:text-fg"
                  }`}
                >
                  <Users className="size-3.5" />
                  <span>Guests: {room.allowGuests ? "Allowed" : "Off"}</span>
                </button>

                {/* Hide Leaderboard Toggle (RF05, CA07) */}
                <button
                  type="button"
                  onClick={live.toggleLeaderboard}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition-colors ${
                    room.hideLeaderboard
                      ? "bg-accent/20 text-accent font-semibold"
                      : "bg-primary/40 text-fg-secondary hover:text-fg"
                  }`}
                >
                  <span>Leaderboard: {room.hideLeaderboard ? "Hidden" : "Public"}</span>
                </button>
              </div>

              {/* Lobby Participants List (RF03, CA04) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-fg uppercase tracking-wider">
                    Connected Students ({onlineCount}/{participantsList.length})
                  </h4>
                  <span className="text-[11px] text-muted">Max 40 participants</span>
                </div>

                {participantsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle p-6 text-center">
                    <p className="text-xs text-muted">
                      Waiting for students to join with code{" "}
                      <span className="font-mono font-bold text-accent">{room.code}</span>…
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-subtle/50 rounded-2xl border border-border-subtle bg-primary/20 overflow-hidden">
                    {participantsList.map((p) => {
                      const isOnline = p.online !== false;
                      return (
                        <li
                          key={p.uid}
                          className="flex items-center justify-between p-3 transition-colors hover:bg-primary/30"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`size-2.5 rounded-full ${
                                isOnline ? "bg-success animate-pulse" : "bg-neutral-500"
                              }`}
                              title={isOnline ? "Online" : "Offline"}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-fg truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-muted">
                                {p.via === "pin"
                                  ? "PIN verified"
                                  : p.via === "portal"
                                    ? "Student Portal"
                                    : "Guest"}{" "}
                                · {p.score || 0} pts
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => live.kickStudent(p.uid)}
                            title="Remove student from class"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted hover:bg-red-500/20 hover:text-red-500 transition-colors"
                          >
                            <UserX className="size-3.5" />
                            <span>Kick</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isLive && room && (
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3 bg-primary/20">
            <span className="text-xs text-muted">Live room running</span>
            <Button
              variant="ghost"
              onClick={live.closeRoom}
              className="min-h-8 px-3 text-xs text-red-500 hover:bg-red-500/20"
            >
              Close live room
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
