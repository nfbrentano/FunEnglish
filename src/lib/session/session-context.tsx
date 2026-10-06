"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { useStudentMode } from "@/lib/student-mode";
import type { CreateNoteInput, StudentNote } from "@/lib/notes/types";
import {
  createSession,
  createOneToOneSession,
  discardSession,
  endSession,
  getActiveSession,
  updateSession,
} from "./repository";
import {
  SESSION_LOCAL_STORAGE_PREFIX,
  type ClassroomSession,
  type SessionActivity,
  type SessionEndReviewData,
  type SessionTab,
  type SessionWord,
} from "./types";

export interface SessionContextType {
  activeSession: ClassroomSession | null;
  hasActiveSession: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  activeTab: SessionTab;
  setActiveTab: (tab: SessionTab) => void;
  isProjectionMode: boolean;
  setProjectionMode: (active: boolean) => void;
  toggleProjectionMode: () => void;

  // Actions
  startClass: (classId: string, className: string, studentIds: string[]) => Promise<void>;
  startOneToOne: (studentId: string, studentName: string, mode?: "online" | "in-person") => Promise<void>;
  resumeSession: () => void;
  dismissResume: () => void;
  discardCurrentSession: () => Promise<void>;

  setAttendance: (studentId: string, isPresent: boolean) => void;
  recordActivity: (activity: { id: string; title: string }) => void;
  addSessionWord: (word: SessionWord) => void;
  removeSessionWord: (term: string) => void;
  addSessionNote: (note: CreateNoteInput & { studentId: string }) => Promise<void>;
  removeSessionNote: (noteId: string) => void;
  updateBoardText: (text: string) => void;

  // Review & Conflict states
  resumePromptClass: ClassroomSession | null;
  conflictModalOpen: boolean;
  pendingClassToStart: { classId: string; className: string; studentIds: string[] } | null;
  cancelStartConflict: () => void;
  resolveConflictByEnding: () => void;
  resolveConflictByDiscarding: () => Promise<void>;

  reviewModalOpen: boolean;
  openReviewModal: () => void;
  closeReviewModal: () => void;
  confirmEndClass: (reviewData: SessionEndReviewData) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

function getStorageKey(uid: string): string {
  return `${SESSION_LOCAL_STORAGE_PREFIX}-${uid}`;
}

function saveLocalSnapshot(uid: string, session: ClassroomSession | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(uid);
    if (!session) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(
        key,
        JSON.stringify({
          ...session,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString(),
          lastActivityAt: session.lastActivityAt?.toISOString(),
        }),
      );
    }
  } catch (err) {
    console.warn("Failed to save local session snapshot:", err);
  }
}

function loadLocalSnapshot(uid: string): ClassroomSession | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getStorageKey(uid);
    const item = localStorage.getItem(key);
    if (!item) return null;
    const data = JSON.parse(item);
    if (!data || data.status !== "active") return null;
    return {
      ...data,
      startedAt: new Date(data.startedAt),
      endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
      lastActivityAt: data.lastActivityAt ? new Date(data.lastActivityAt) : undefined,
      notes: Array.isArray(data.notes)
        ? data.notes.map((n: Record<string, unknown>) => ({
            ...n,
            createdAt: new Date(n.createdAt as string),
            updatedAt: new Date(n.updatedAt as string),
          }))
        : [],
    };
  } catch (err) {
    console.warn("Failed to load local session snapshot:", err);
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isStudentMode = useStudentMode();

  const [activeSession, setActiveSession] = useState<ClassroomSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SessionTab>("students");
  const [isProjectionMode, setIsProjectionMode] = useState(false);

  const [resumePromptClass, setResumePromptClass] = useState<ClassroomSession | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingClassToStart, setPendingClassToStart] = useState<{
    classId: string;
    className: string;
    studentIds: string[];
  } | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Ref for debounced Firestore sync
  const pendingUpdatesRef = useRef<Partial<ClassroomSession> | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync to local storage & schedule debounced Firestore save
  const scheduleSync = useCallback(
    (updatedSession: ClassroomSession, immediateUpdates?: Partial<ClassroomSession>) => {
      if (!user) return;
      saveLocalSnapshot(user.uid, updatedSession);

      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...immediateUpdates,
        attendance: updatedSession.attendance,
        activitiesPlayed: updatedSession.activitiesPlayed,
        newWords: updatedSession.newWords,
        notes: updatedSession.notes,
        boardText: updatedSession.boardText,
        classNotes: updatedSession.classNotes,
      };

      if (!syncTimeoutRef.current) {
        syncTimeoutRef.current = setTimeout(() => {
          if (user && pendingUpdatesRef.current && updatedSession.id) {
            const updatesToPush = pendingUpdatesRef.current;
            pendingUpdatesRef.current = null;
            updateSession(user.uid, updatedSession.id, updatesToPush).catch((e) =>
              console.warn("Debounced session update error:", e),
            );
          }
          syncTimeoutRef.current = null;
        }, 3000); // 3-second debounce (satisfies <= 1 write / 5s)
      }
    },
    [user],
  );

  // Initial restoration on mount / login
  useEffect(() => {
    if (!user || isStudentMode) {
      setActiveSession(null);
      setResumePromptClass(null);
      return;
    }

    let isMounted = true;

    // Check local snapshot first
    const local = loadLocalSnapshot(user.uid);
    if (local) {
      setResumePromptClass(local);
    }

    // Check remote active session
    getActiveSession(user.uid)
      .then((remote) => {
        if (!isMounted) return;
        if (remote && remote.status === "active") {
          // If remote exists, show resume prompt with freshest data
          setResumePromptClass((prev) => prev ?? remote);
        }
      })
      .catch((err) => console.warn("Failed checking active session:", err));

    return () => {
      isMounted = false;
    };
  }, [user, isStudentMode]);

  // Screen width: default collapsed if screen < 1280px (RNF02)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkWidth = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true);
      }
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Fullscreen listener: projection mode ON by default in fullscreen (RF06, CA05)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      if (isFs) {
        setIsProjectionMode(true);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard shortcuts (RF12)
  useEffect(() => {
    if (!activeSession) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disabled when typing in input, textarea or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (key === "T") {
        e.preventDefault();
        setActiveTab("timer");
        setIsCollapsed(false);
      } else if (key === "B") {
        e.preventDefault();
        setActiveTab("board");
        setIsCollapsed(false);
      } else if (key === "P") {
        e.preventDefault();
        setActiveTab("picker");
        setIsCollapsed(false);
      } else if (key === "N") {
        e.preventDefault();
        setActiveTab("notes");
        setIsCollapsed(false);
      } else if (e.key === "[") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession]);

  // Start class action (RF01, RF10, CA01, CA09)
  const startClass = useCallback(
    async (classId: string, className: string, studentIds: string[]) => {
      if (!user) throw new Error("Must be logged in to start class.");

      // Check if another session is already active
      if (activeSession && activeSession.status === "active") {
        if (activeSession.classId === classId) {
          // Same class: just reopen sidebar
          setIsSidebarOpen(true);
          setIsCollapsed(false);
          return;
        }
        // Different class: prompt conflict modal (CA09)
        setPendingClassToStart({ classId, className, studentIds });
        setConflictModalOpen(true);
        return;
      }

      const session = await createSession(user.uid, classId, className, studentIds);
      setActiveSession(session);
      saveLocalSnapshot(user.uid, session);
      setIsSidebarOpen(true);
      setIsCollapsed(false);
      setActiveTab("students"); // CA01: aba Students com presentes
      setResumePromptClass(null);
    },
    [user, activeSession],
  );

  // Start 1:1 session action (Spec 17)
  const startOneToOne = useCallback(
    async (studentId: string, studentName: string, mode?: "online" | "in-person") => {
      if (!user) throw new Error("Must be logged in to start lesson.");

      if (activeSession && activeSession.status === "active") {
        if (activeSession.studentId === studentId && activeSession.kind === "one-to-one") {
          setIsSidebarOpen(true);
          setIsCollapsed(false);
          return;
        }
        // Conflict logic needs updating to handle 1:1 conflicts, for now we just use the same prompt
        setPendingClassToStart({ classId: studentId, className: studentName, studentIds: [studentId] });
        setConflictModalOpen(true);
        return;
      }

      const session = await createOneToOneSession(user.uid, studentId, studentName, mode);
      setActiveSession(session);
      saveLocalSnapshot(user.uid, session);
      setIsSidebarOpen(true);
      setIsCollapsed(false);
      setActiveTab("notes"); // In 1:1 we default to notes instead of students
      setResumePromptClass(null);
    },
    [user, activeSession],
  );

  // Resume class action (RF09, CA08)
  const resumeSession = useCallback(() => {
    if (!resumePromptClass) return;
    setActiveSession(resumePromptClass);
    setIsSidebarOpen(true);
    setIsCollapsed(false);
    setResumePromptClass(null);
  }, [resumePromptClass]);

  const dismissResume = useCallback(() => {
    if (!user) return;
    saveLocalSnapshot(user.uid, null);
    setResumePromptClass(null);
  }, [user]);

  // Discard current active session (RF10, CA09)
  const discardCurrentSession = useCallback(async () => {
    if (!user || !activeSession) return;
    await discardSession(user.uid, activeSession.id);
    saveLocalSnapshot(user.uid, null);
    setActiveSession(null);
    setIsSidebarOpen(false);
    setReviewModalOpen(false);
  }, [user, activeSession]);

  // Conflict modal resolution (CA09)
  const cancelStartConflict = useCallback(() => {
    setConflictModalOpen(false);
    setPendingClassToStart(null);
  }, []);

  const resolveConflictByEnding = useCallback(() => {
    setConflictModalOpen(false);
    setReviewModalOpen(true);
  }, []);

  const resolveConflictByDiscarding = useCallback(async () => {
    if (!user || !activeSession || !pendingClassToStart) return;
    await discardSession(user.uid, activeSession.id);
    saveLocalSnapshot(user.uid, null);
    const toStart = pendingClassToStart;
    setConflictModalOpen(false);
    setPendingClassToStart(null);
    await startClass(toStart.classId, toStart.className, toStart.studentIds);
  }, [user, activeSession, pendingClassToStart, startClass]);

  // Attendance (RF04, CA01, CA03)
  const setAttendance = useCallback(
    (studentId: string, isPresent: boolean) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          attendance: {
            ...prev.attendance,
            [studentId]: isPresent,
          },
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [scheduleSync],
  );

  // Automatic activity tracking (RF05, CA04)
  const recordActivity = useCallback(
    (activity: { id: string; title: string }) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        const exists = prev.activitiesPlayed.some((a) => a.id === activity.id);
        const newActivities: SessionActivity[] = exists
          ? prev.activitiesPlayed
          : [...prev.activitiesPlayed, { id: activity.id, title: activity.title, timestamp: Date.now() }];

        const updated = {
          ...prev,
          activitiesPlayed: newActivities,
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [scheduleSync],
  );

  // Vocabulary words (RF07, RF08, CA06, CA07)
  const addSessionWord = useCallback(
    (word: SessionWord) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        const termClean = word.term.trim();
        if (!termClean) return prev;
        if (prev.newWords.some((w) => w.term.toLowerCase() === termClean.toLowerCase())) {
          return prev;
        }
        const updated = {
          ...prev,
          newWords: [...prev.newWords, { ...word, term: termClean }],
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [scheduleSync],
  );

  const removeSessionWord = useCallback(
    (term: string) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          newWords: prev.newWords.filter((w) => w.term.toLowerCase() !== term.toLowerCase()),
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [scheduleSync],
  );

  // Notes (RF03, RF06, RF08, CA05, CA06, CA11)
  const addSessionNote = useCallback(
    async (noteInput: CreateNoteInput & { studentId: string }) => {
      const now = new Date();
      const newNote: StudentNote = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        studentId: noteInput.studentId,
        category: noteInput.category,
        text: noteInput.text.trim(),
        correction: noteInput.correction?.trim() || undefined,
        visibility: noteInput.visibility || "private",
        resolved: Boolean(noteInput.resolved),
        sessionId: activeSession?.id,
        createdAt: now,
        updatedAt: now,
      };

      setActiveSession((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          notes: [newNote, ...prev.notes],
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [activeSession?.id, scheduleSync],
  );

  const removeSessionNote = useCallback(
    (noteId: string) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        const updated = {
          ...prev,
          notes: prev.notes.filter((n) => n.id !== noteId),
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [scheduleSync],
  );

  // Whiteboard text (RF03, RF07)
  const updateBoardText = useCallback(
    (text: string) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        if (prev.boardText === text) return prev;
        const updated = {
          ...prev,
          boardText: text,
        };
        scheduleSync(updated);
        return updated;
      });
    },
    [scheduleSync],
  );

  // Review & End session (RF07, RF08, CA06, CA07, CA11)
  const openReviewModal = useCallback(() => {
    setReviewModalOpen(true);
  }, []);

  const closeReviewModal = useCallback(() => {
    setReviewModalOpen(false);
  }, []);

  const confirmEndClass = useCallback(
    async (reviewData: SessionEndReviewData) => {
      if (!user || !activeSession) return;
      await endSession(user.uid, activeSession, reviewData);
      saveLocalSnapshot(user.uid, null);
      setActiveSession(null);
      setIsSidebarOpen(false);
      setReviewModalOpen(false);
    },
    [user, activeSession],
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleProjectionMode = useCallback(() => {
    setIsProjectionMode((prev) => !prev);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        hasActiveSession: Boolean(activeSession && activeSession.status === "active"),
        isSidebarOpen,
        setIsSidebarOpen,
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
        activeTab,
        setActiveTab,
        isProjectionMode,
        setProjectionMode: setIsProjectionMode,
        toggleProjectionMode,

        startClass,
        startOneToOne,
        resumeSession,
        dismissResume,
        discardCurrentSession,

        setAttendance,
        recordActivity,
        addSessionWord,
        removeSessionWord,
        addSessionNote,
        removeSessionNote,
        updateBoardText,

        resumePromptClass,
        conflictModalOpen,
        pendingClassToStart,
        cancelStartConflict,
        resolveConflictByEnding,
        resolveConflictByDiscarding,

        reviewModalOpen,
        openReviewModal,
        closeReviewModal,
        confirmEndClass,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextType | null {
  return useContext(SessionContext);
}
