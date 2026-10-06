"use client";

import {
  Clock,
  Edit3,
  Eye,
  EyeOff,
  LogOut,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Radio,
  Sparkles,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClassroomBoard } from "@/components/board/classroom-board";
import { ClassroomPicker } from "@/components/ui/classroom-picker";
import { ClassroomTimer } from "@/components/ui/classroom-timer";
import { LiveRoomSidebarPanel } from "@/components/live/live-room-sidebar-panel";
import { InteractiveWhiteboard } from "@/components/live/interactive-whiteboard";
import { useClasses } from "@/lib/classes/use-classes";
import { useLiveRoom } from "@/lib/live/live-context";
import {
  NOTE_CATEGORIES,
  type CreateNoteInput,
  type NoteCategory,
  type NoteVisibility,
} from "@/lib/notes/types";
import { useSessionContext } from "@/lib/session/session-context";
import type { SessionTab } from "@/lib/session/types";
import { strings } from "@/lib/strings";
import { useStudentMode } from "@/lib/student-mode";
import { useAuth } from "@/lib/auth/use-auth";

function formatElapsed(startedAt: Date): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ClassroomSidebar() {
  const { user } = useAuth();
  const isStudentMode = useStudentMode();
  const session = useSessionContext();
  const live = useLiveRoom();
  const { students } = useClasses();

  // Auto-enable projection mode when live room is in presentation mode (RF07, CA08)
  useEffect(() => {
    if (live?.liveRoom?.state.mode === "presentation" && !session?.isProjectionMode) {
      session?.setProjectionMode(true);
    }
  }, [live?.liveRoom?.state.mode, session]);

  // Ticking clock for session duration (CA01: "o relógio da sessão em 00:00")
  const [elapsedStr, setElapsedStr] = useState("00:00");
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  // Notes tab inputs
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [noteCorrection, setNoteCorrection] = useState("");
  const [noteCategory, setNoteCategory] = useState<NoteCategory>("general");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>("private");

  const active = session?.activeSession;
  const startedAt = active?.startedAt;

  useEffect(() => {
    if (!startedAt) {
      setElapsedStr("00:00");
      return;
    }
    const update = () => setElapsedStr(formatElapsed(startedAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Fullscreen portal target handling (CA02)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleFs = () => {
      setPortalTarget(document.fullscreenElement || null);
    };
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  // Update layout margin on desktop so player isn't covered (RNF02)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const mainEl = document.getElementById("main");
    if (!mainEl) return;

    if (session?.hasActiveSession && session.isSidebarOpen) {
      if (!session.isCollapsed) {
        document.body.classList.add("session-sidebar-expanded");
      } else {
        document.body.classList.remove("session-sidebar-expanded");
        document.body.classList.add("session-sidebar-collapsed");
      }
    } else {
      document.body.classList.remove("session-sidebar-expanded", "session-sidebar-collapsed");
    }

    return () => {
      document.body.classList.remove("session-sidebar-expanded", "session-sidebar-collapsed");
    };
  }, [session?.hasActiveSession, session?.isSidebarOpen, session?.isCollapsed]);

  // If unauthenticated, in student mode, or no active session, do not render (RNF05, CA10)
  if (!user || isStudentMode || !session || !session.hasActiveSession || !session.activeSession) {
    return null;
  }

  const {
    activeSession,
    isSidebarOpen,
    isCollapsed,
    toggleCollapsed,
    activeTab,
    setActiveTab,
    isProjectionMode,
    toggleProjectionMode,
    setAttendance,
    addSessionNote,
    removeSessionNote,
    openReviewModal,
    updateBoardText,
    addSessionWord,
  } = session;

  // Filter students belonging to this class
  const classStudents = students.filter((s) => 
    (activeSession.classId && s.classIds.includes(activeSession.classId)) || 
    (activeSession.studentId && s.id === activeSession.studentId)
  );

  // If none found with classIds, fallback to students present in attendance
  const effectiveStudents: Array<{
    id: string;
    name: string;
    email?: string;
    classIds: string[];
  }> =
    classStudents.length > 0
      ? classStudents
      : Object.keys(activeSession.attendance).map((id) => {
          const found = students.find((s) => s.id === id);
          return found || { id, name: "Student", email: undefined, classIds: activeSession.classId ? [activeSession.classId] : [] };
        });

  // Present students list & count (CA01, CA03)
  const presentStudents = effectiveStudents.filter(
    (s) => activeSession.attendance[s.id] !== false,
  );
  const presentStudentNames = presentStudents.map((s) => s.name);

  // Present count string
  const presentCount = presentStudents.length;
  const totalCount = effectiveStudents.length;

  // Filter notes for projection mode (CA05)
  // Private notes hidden in projection mode!
  const displayedNotes = isProjectionMode
    ? activeSession.notes.filter((n) => n.visibility === "shared")
    : activeSession.notes;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text || !selectedStudentId) return;

    await addSessionNote({
      studentId: selectedStudentId,
      text,
      correction: noteCorrection.trim() || undefined,
      category: noteCategory,
      visibility: noteVisibility,
    });

    setNoteText("");
    setNoteCorrection("");
  };

  const sidebarContent = (
    <aside
      aria-label="Classroom Session Sidebar"
      className={`fixed right-0 top-0 bottom-0 z-40 flex flex-col border-l border-border-subtle bg-elevated shadow-2xl transition-all duration-200 select-none ${
        isCollapsed ? "w-16" : "w-full max-w-105 sm:w-105"
      }`}
    >
      {/* Top Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2 bg-primary/30">
        {isCollapsed ? (
          <div className="flex w-full flex-col items-center justify-center gap-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Expand sidebar ([)"
              className="rounded-xl p-2 text-fg-secondary hover:bg-elevated hover:text-fg"
            >
              <PanelRightOpen className="size-5" />
            </button>
            <span className="font-mono text-[10px] font-semibold text-accent">{elapsedStr}</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col overflow-hidden pr-2">
              <span className="truncate font-display text-base font-semibold text-fg">
                {activeSession.className}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-accent">
                  <Clock className="size-3" />
                  {elapsedStr}
                </span>
                <span className="text-[10px] text-muted">
                  · {presentCount}/{totalCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Live Room Button (RF01, CA01) */}
              <button
                type="button"
                onClick={() => {
                  live?.openModal();
                }}
                title={live?.isLiveActive ? `Live Room active: ${live.liveRoom?.code}` : "Open live room"}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  live?.isLiveActive
                    ? "bg-accent/20 text-accent font-bold"
                    : "border border-border-subtle bg-primary/40 text-fg-secondary hover:text-fg"
                }`}
              >
                <Radio className={`size-3.5 ${live?.isLiveActive ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline">
                  {live?.isLiveActive ? `Live: ${live.liveRoom?.code}` : "Live room"}
                </span>
              </button>

              {/* Lousa Toggle (RF01, CA01, CA02) */}
              <button
                type="button"
                onClick={() => live?.toggleWhiteboard()}
                title={
                  live?.isWhiteboardOpen
                    ? "Fechar Lousa"
                    : "Abrir Lousa"
                }
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  live?.isWhiteboardOpen
                    ? "bg-accent text-primary shadow-sm"
                    : "border border-border-subtle bg-primary/40 text-fg-secondary hover:text-fg"
                }`}
              >
                <Edit3 className="size-3.5" />
                <span className="hidden sm:inline">
                  {live?.isWhiteboardOpen ? "Lousa Aberta" : "Lousa"}
                </span>
              </button>

              {/* Projection Mode Toggle (RF06, CA05) */}
              <button
                type="button"
                onClick={toggleProjectionMode}
                title={
                  isProjectionMode
                    ? strings.session.projectionModeOn
                    : strings.session.projectionModeOff
                }
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  isProjectionMode
                    ? "bg-accent text-primary shadow-sm"
                    : "border border-border-subtle bg-primary/40 text-fg-secondary hover:text-fg"
                }`}
              >
                {isProjectionMode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span className="hidden sm:inline">
                  {isProjectionMode ? "Projecting" : "Normal"}
                </span>
              </button>

              {/* End Class button (RF07) */}
              <button
                type="button"
                onClick={openReviewModal}
                title={strings.session.endClass}
                className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">{strings.session.endClass}</span>
              </button>

              {/* Collapse button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Collapse sidebar ([)"
                className="rounded-xl p-1.5 text-fg-secondary hover:bg-elevated hover:text-fg"
              >
                <PanelRightClose className="size-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Duplicate Device Alert Banner (CA13) */}
      {live?.duplicateDeviceAlert && (
        <div
          role="alert"
          className="flex items-center justify-between border-b border-accent/40 bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent animate-in fade-in-0 duration-200"
        >
          <span>{live.duplicateDeviceAlert}</span>
          <button
            type="button"
            onClick={live.dismissDuplicateAlert}
            className="p-1 hover:text-fg transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Tabs bar (RNF03: role="tablist") */}
      <div
        role="tablist"
        aria-label="Classroom Tools"
        className={`flex shrink-0 border-b border-border-subtle bg-primary/20 ${
          isCollapsed ? "flex-col items-center py-3 gap-2" : "items-center justify-around p-1.5"
        }`}
      >
        {/* Students Tab */}
        {activeSession.kind !== "one-to-one" && (
          <button
            type="button"
            role="tab"
            id="tab-students"
            aria-selected={activeTab === "students"}
            aria-controls="panel-students"
            onClick={() => {
              setActiveTab("students");
              if (isCollapsed) toggleCollapsed();
            }}
            title={`${strings.session.tabs.students} (${presentCount})`}
            className={`flex items-center justify-center gap-1.5 rounded-xl transition-all ${
              isCollapsed ? "size-10" : "flex-1 py-1.5 text-xs font-medium"
            } ${
              activeTab === "students"
                ? "bg-accent text-primary shadow-sm"
                : "text-fg-secondary hover:bg-elevated hover:text-fg"
            }`}
          >
            <Users className="size-4" />
            {!isCollapsed && <span>{strings.session.tabs.students}</span>}
          </button>
        )}

        {/* Timer Tab */}
        <button
          type="button"
          role="tab"
          id="tab-timer"
          aria-selected={activeTab === "timer"}
          aria-controls="panel-timer"
          onClick={() => {
            setActiveTab("timer");
            if (isCollapsed) toggleCollapsed();
          }}
          title={strings.session.tabs.timer}
          className={`flex items-center justify-center gap-1.5 rounded-xl transition-all ${
            isCollapsed ? "size-10" : "flex-1 py-1.5 text-xs font-medium"
          } ${
            activeTab === "timer"
              ? "bg-accent text-primary shadow-sm"
              : "text-fg-secondary hover:bg-elevated hover:text-fg"
          }`}
        >
          <Timer className="size-4" />
          {!isCollapsed && <span>{strings.session.tabs.timer}</span>}
        </button>

        {/* Board Tab */}
        <button
          type="button"
          role="tab"
          id="tab-board"
          aria-selected={activeTab === "board"}
          aria-controls="panel-board"
          onClick={() => {
            setActiveTab("board");
            if (isCollapsed) toggleCollapsed();
          }}
          title={strings.session.tabs.board}
          className={`flex items-center justify-center gap-1.5 rounded-xl transition-all ${
            isCollapsed ? "size-10" : "flex-1 py-1.5 text-xs font-medium"
          } ${
            activeTab === "board"
              ? "bg-accent text-primary shadow-sm"
              : "text-fg-secondary hover:bg-elevated hover:text-fg"
          }`}
        >
          <Edit3 className="size-4" />
          {!isCollapsed && <span>{strings.session.tabs.board}</span>}
        </button>

        {/* Picker Tab */}
        {activeSession.kind !== "one-to-one" && (
          <button
            type="button"
            role="tab"
            id="tab-picker"
            aria-selected={activeTab === "picker"}
            aria-controls="panel-picker"
            onClick={() => {
              setActiveTab("picker");
              if (isCollapsed) toggleCollapsed();
            }}
            title={strings.session.tabs.picker}
            className={`flex items-center justify-center gap-1.5 rounded-xl transition-all ${
              isCollapsed ? "size-10" : "flex-1 py-1.5 text-xs font-medium"
            } ${
              activeTab === "picker"
                ? "bg-accent text-primary shadow-sm"
                : "text-fg-secondary hover:bg-elevated hover:text-fg"
            }`}
          >
            <Sparkles className="size-4" />
            {!isCollapsed && <span>{strings.session.tabs.picker}</span>}
          </button>
        )}

        {/* Notes Tab */}
        <button
          type="button"
          role="tab"
          id="tab-notes"
          aria-selected={activeTab === "notes"}
          aria-controls="panel-notes"
          onClick={() => {
            setActiveTab("notes");
            if (isCollapsed) toggleCollapsed();
          }}
          title={strings.session.tabs.notes}
          className={`flex items-center justify-center gap-1.5 rounded-xl transition-all ${
            isCollapsed ? "size-10" : "flex-1 py-1.5 text-xs font-medium"
          } ${
            activeTab === "notes"
              ? "bg-accent text-primary shadow-sm"
              : "text-fg-secondary hover:bg-elevated hover:text-fg"
          }`}
        >
          <span className="relative">
            <span className="flex size-4 items-center justify-center font-bold text-xs">N</span>
            {activeSession.notes.length > 0 && (
              <span className="absolute -top-1 -right-2 flex size-3 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-primary">
                {activeSession.notes.length}
              </span>
            )}
          </span>
          {!isCollapsed && <span>{strings.session.tabs.notes}</span>}
        </button>

        {/* Live Room Tab (RF01, RF03, CA01) */}
        <button
          type="button"
          role="tab"
          id="tab-live"
          aria-selected={activeTab === "live"}
          aria-controls="panel-live"
          onClick={() => {
            setActiveTab("live");
            if (isCollapsed) toggleCollapsed();
          }}
          title={
            live?.isLiveActive
              ? `Live Room (${Object.keys(live.liveRoom?.participants || {}).length} joined)`
              : "Live Room"
          }
          className={`flex items-center justify-center gap-1.5 rounded-xl transition-all ${
            isCollapsed ? "size-10" : "flex-1 py-1.5 text-xs font-medium"
          } ${
            activeTab === "live"
              ? "bg-accent text-primary shadow-sm"
              : live?.isLiveActive
                ? "text-accent font-semibold hover:bg-elevated"
                : "text-fg-secondary hover:bg-elevated hover:text-fg"
          }`}
        >
          <Radio className={`size-4 ${live?.isLiveActive ? "animate-pulse" : ""}`} />
          {!isCollapsed && <span>Live</span>}
        </button>
      </div>

      {/* Main panel body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {/* 1. STUDENTS TAB PANEL (CA01, CA03, CA05) */}
          {activeTab === "students" && (
            <div
              id="panel-students"
              role="tabpanel"
              aria-labelledby="tab-students"
              className="p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-fg">
                    {strings.session.students.title}
                  </h3>
                  <p className="text-xs text-muted">
                    {strings.session.students.presentCount(presentCount, totalCount)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    effectiveStudents.forEach((s) => setAttendance(s.id, true));
                  }}
                  className="min-h-8 px-2.5 py-1 text-xs text-accent hover:text-accent/90"
                >
                  {strings.session.students.allPresent}
                </Button>
              </div>

              {effectiveStudents.length === 0 ? (
                <p className="text-xs text-muted italic">No students in this class.</p>
              ) : (
                <ul className="space-y-2">
                  {effectiveStudents.map((student) => {
                    const isPresent = activeSession.attendance[student.id] !== false;
                    return (
                      <li
                        key={student.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-colors ${
                          isPresent
                            ? "border-border-subtle bg-primary/40"
                            : "border-border-subtle/50 bg-primary/10 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-sm font-medium truncate ${
                              isPresent ? "text-fg" : "text-fg-secondary line-through"
                            }`}
                          >
                            {student.name}
                          </span>
                          {/* Student email hidden in projection mode (RF06, CA05)! */}
                          {student.email && !isProjectionMode && (
                            <span className="text-xs text-muted truncate">{student.email}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setAttendance(student.id, !isPresent)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            isPresent
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : "bg-muted/20 text-fg-secondary hover:bg-muted/30"
                          }`}
                        >
                          {isPresent
                            ? strings.session.students.present
                            : strings.session.students.absent}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* 2. TIMER TAB PANEL */}
          {activeTab === "timer" && (
            <div
              id="panel-timer"
              role="tabpanel"
              aria-labelledby="tab-timer"
              className="p-4 space-y-3"
            >
              {live?.isLiveActive && (
                <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-primary/30 p-2.5 px-3">
                  <span className="text-xs font-semibold text-fg">Show to students</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !live.isTimerMirrored;
                      live.setIsTimerMirrored(next);
                      if (next) {
                        live.syncTimer({
                          endsAt: Date.now() + 60000,
                          durationSec: 60,
                          running: true,
                        });
                      } else {
                        live.returnToLobby();
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      live.isTimerMirrored
                        ? "bg-accent text-primary shadow-xs"
                        : "border border-border-subtle bg-primary/40 text-fg-secondary hover:text-fg"
                    }`}
                  >
                    {live.isTimerMirrored ? "Mirroring ON" : "Mirror OFF"}
                  </button>
                </div>
              )}
              <ClassroomTimer className="w-full" />
            </div>
          )}

          {/* 3. BOARD TAB PANEL */}
          {activeTab === "board" && (
            <div
              id="panel-board"
              role="tabpanel"
              aria-labelledby="tab-board"
              className="h-full min-h-115 p-2 space-y-2"
            >
              {live?.isLiveActive && (
                <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-primary/30 p-2 px-3">
                  <span className="text-xs font-semibold text-fg">Show to students</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !live.isBoardMirrored;
                      live.setIsBoardMirrored(next);
                      if (next) {
                        live.syncBoard({
                          updatedAt: Date.now(),
                          text: activeSession.boardText || "Teacher's Whiteboard",
                        });
                      } else {
                        live.returnToLobby();
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      live.isBoardMirrored
                        ? "bg-accent text-primary shadow-xs"
                        : "border border-border-subtle bg-primary/40 text-fg-secondary hover:text-fg"
                    }`}
                  >
                    {live.isBoardMirrored ? "Mirroring ON" : "Mirror OFF"}
                  </button>
                </div>
              )}
              <ClassroomBoard
                sessionId={activeSession.id}
                onBoardTextChange={(text) => {
                  updateBoardText(text);
                  if (live?.isBoardMirrored) {
                    live.syncBoard({ updatedAt: Date.now(), text });
                  }
                }}
                onSendWords={(terms) => {
                  terms.forEach((term) => addSessionWord({ term }));
                }}
                className="h-full"
              />
            </div>
          )}

          {/* 4. PICKER TAB PANEL (CA03: absent excluded) */}
          {activeTab === "picker" && (
            <div
              id="panel-picker"
              role="tabpanel"
              aria-labelledby="tab-picker"
              className="p-3 space-y-2"
            >
              {live?.isLiveActive && (
                <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-primary/30 p-2 px-3">
                  <span className="text-xs font-semibold text-fg">Show to students</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !live.isPickerMirrored;
                      live.setIsPickerMirrored(next);
                      if (!next) {
                        live.returnToLobby();
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      live.isPickerMirrored
                        ? "bg-accent text-primary shadow-xs"
                        : "border border-border-subtle bg-primary/40 text-fg-secondary hover:text-fg"
                    }`}
                  >
                    {live.isPickerMirrored ? "Mirroring ON" : "Mirror OFF"}
                  </button>
                </div>
              )}
              <ClassroomPicker
                students={presentStudentNames}
                hasActiveSession={true}
                className="w-full"
              />
            </div>
          )}

          {/* 5. NOTES TAB PANEL (CA05: private notes hidden in projection mode) */}
          {activeTab === "notes" && (
            <div
              id="panel-notes"
              role="tabpanel"
              aria-labelledby="tab-notes"
              className="p-4 space-y-4"
            >
              <form onSubmit={handleAddNote} className="space-y-3 rounded-2xl border border-border-subtle bg-primary/30 p-3">
                <div className="flex gap-2">
                  <select
                    aria-label="Select student"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex-1 rounded-xl border border-border-subtle bg-primary px-3 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                    required
                  >
                    <option value="">{strings.session.notes.selectStudent}</option>
                    {effectiveStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {activeSession.attendance[s.id] === false ? "(Absent)" : ""}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Note category"
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as NoteCategory)}
                    className="rounded-xl border border-border-subtle bg-primary px-2.5 py-1.5 text-xs text-fg capitalize focus:border-accent focus:outline-none"
                  >
                    {NOTE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={strings.session.notes.quickNotePlaceholder}
                  rows={2}
                  className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                  required
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setNoteVisibility((prev) => (prev === "shared" ? "private" : "shared"))
                      }
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        noteVisibility === "shared"
                          ? "bg-success/20 text-success"
                          : "bg-muted/20 text-fg-secondary"
                      }`}
                    >
                      {noteVisibility === "shared"
                        ? strings.session.notes.sharedBadge
                        : strings.session.notes.privateBadge}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={!noteText.trim() || !selectedStudentId}
                    className="min-h-8 px-3 py-1 text-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Note</span>
                  </Button>
                </div>
              </form>

              {/* Notes list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-fg">
                    {strings.session.notes.title} ({displayedNotes.length})
                  </h4>
                  {isProjectionMode && (
                    <span className="text-[10px] text-accent font-medium">
                      Private notes hidden
                    </span>
                  )}
                </div>

                {displayedNotes.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    {strings.session.notes.noNotesYet}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {displayedNotes.map((note) => {
                      const student = effectiveStudents.find((s) => s.id === note.studentId);
                      return (
                        <li
                          key={note.id}
                          className="flex items-start justify-between gap-2 rounded-2xl border border-border-subtle bg-primary/20 p-2.5 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-fg">
                                {student?.name || "Student"}
                              </span>
                              <span className="rounded border border-border-strong px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-fg-secondary uppercase">
                                {note.category}
                              </span>
                              <span
                                className={`rounded px-1 text-[9px] font-medium ${
                                  note.visibility === "shared"
                                    ? "bg-success/20 text-success"
                                    : "bg-muted/20 text-fg-secondary"
                                }`}
                              >
                                {note.visibility}
                              </span>
                            </div>
                            <p className="text-fg">{note.text}</p>
                            {note.correction && (
                              <p className="text-accent">→ {note.correction}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSessionNote(note.id)}
                            className="text-muted hover:text-red-500 p-1"
                            aria-label="Remove note"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 6. LIVE ROOM TAB PANEL */}
          {activeTab === "live" && (
            <div
              id="panel-live"
              role="tabpanel"
              aria-labelledby="tab-live"
              className="h-full"
            >
              <LiveRoomSidebarPanel />
            </div>
          )}
        </div>
      )}
    </aside>
  );

  // If in fullscreen, portal directly into the fullscreen element (CA02)
  if (portalTarget) {
    return createPortal(
      <>
        {sidebarContent}
        {live?.isWhiteboardOpen && live.roomCode && (
          <InteractiveWhiteboard
            roomCode={live.roomCode}
            isTeacher={true}
            onClose={() => live.toggleWhiteboard()}
          />
        )}
      </>,
      portalTarget
    );
  }

  return (
    <>
      {sidebarContent}
      {live?.isWhiteboardOpen && live.roomCode && (
        <InteractiveWhiteboard
          roomCode={live.roomCode}
          isTeacher={true}
          onClose={() => live.toggleWhiteboard()}
        />
      )}
    </>
  );
}
