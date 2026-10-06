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
import {
  acceptedSentences,
  chunksOf,
  finalPunctuation,
  shuffleChunks,
} from "../activities/sentence-order";
import { useAuth } from "../auth/use-auth";
import { generateRoomCode } from "./code";
import {
  createLiveRoom,
  endLiveRoom,
  kickParticipant as kickParticipantRepo,
  mirrorLiveBoard,
  mirrorLivePicker,
  mirrorLiveTimer,
  revealCurrentQuestion,
  setAllowGuests as setAllowGuestsRepo,
  setHideLeaderboard as setHideLeaderboardRepo,
  setRoomLocked as setRoomLockedRepo,
  subscribeLiveRoom,
  updateLiveRoomState,
} from "./repository";
import type {
  LiveParticipant,
  LiveQuestionChoice,
  LiveRoom,
  LiveRoomBoardState,
  LiveRoomState,
  LiveRoomTimerState,
  LiveRosterStudent,
} from "./types";

export interface LiveRoomContextType {
  liveRoom: LiveRoom | null;
  isLiveActive: boolean;
  roomCode: string | null;

  // Modal control
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Teacher actions
  startRoom: (params: {
    sessionId: string;
    className: string;
    roster: LiveRosterStudent[];
    studentPins: Record<string, string>;
  }) => Promise<string>;
  closeRoom: () => Promise<void>;
  kickStudent: (uid: string) => Promise<void>;
  toggleLock: () => Promise<void>;
  toggleGuests: () => Promise<void>;
  toggleLeaderboard: () => Promise<void>;

  // Activity controls
  launchActivity: (activity: {
    id: string;
    title: string;
    type: string;
    content: any;
  }) => Promise<void>;
  advanceQuestion: () => Promise<void>;
  revealAnswer: () => Promise<void>;
  returnToLobby: () => Promise<void>;

  // Tool mirroring (RF09, CA09)
  isTimerMirrored: boolean;
  setIsTimerMirrored: (mirrored: boolean) => void;
  syncTimer: (timerState: LiveRoomTimerState) => Promise<void>;

  isPickerMirrored: boolean;
  setIsPickerMirrored: (mirrored: boolean) => void;
  syncPicker: (pickedName: string) => Promise<void>;

  isBoardMirrored: boolean;
  setIsBoardMirrored: (mirrored: boolean) => void;
  syncBoard: (boardState: LiveRoomBoardState) => void;

  isWhiteboardOpen: boolean;
  toggleWhiteboard: () => Promise<void>;

  // Alert for duplicate device (CA13)
  duplicateDeviceAlert: string | null;
  dismissDuplicateAlert: () => void;
}

const LiveRoomContext = createContext<LiveRoomContextType | null>(null);

/** The pieces go out already shuffled (never in the right order), like in the player (spec 15). */
function sentenceOrderQuestion(item: { sentence: string; chunks?: string[]; translation?: string }) {
  const chunks = chunksOf(item);
  return {
    prompt: item.translation || "Put the words in order",
    chunks: shuffleChunks(item).map((i) => chunks[i]),
    punctuation: finalPunctuation(item.sentence),
  };
}

const LIVE_ROOM_STORAGE_KEY = "fun-english-active-live-room";

export function LiveRoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [liveRoom, setLiveRoom] = useState<LiveRoom | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mirroring flags
  const [isTimerMirrored, setIsTimerMirrored] = useState(false);
  const [isPickerMirrored, setIsPickerMirrored] = useState(false);
  const [isBoardMirrored, setIsBoardMirrored] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  // Active activity in teacher's session
  const currentActivityRef = useRef<{
    id: string;
    title: string;
    type: string;
    content: any;
    items: any[];
    itemIndex: number;
    startedAt: number;
  } | null>(null);

  // Duplicate device notice (CA13)
  const [duplicateDeviceAlert, setDuplicateDeviceAlert] = useState<string | null>(null);
  const knownParticipantsRef = useRef<Record<string, LiveParticipant>>({});

  // Restore room code on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LIVE_ROOM_STORAGE_KEY);
    if (saved && !roomCode) {
      setRoomCode(saved);
    }
  }, [roomCode]);

  // Subscribe to RTDB when roomCode is active
  useEffect(() => {
    if (!roomCode) {
      setLiveRoom(null);
      return;
    }

    const unsub = subscribeLiveRoom(roomCode, (room) => {
      if (!room || room.state.mode === "ended") {
        setLiveRoom(null);
        setRoomCode(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(LIVE_ROOM_STORAGE_KEY);
        }
        return;
      }

      // Check if any participant was replaced by a new device (CA13)
      for (const [uid, p] of Object.entries(room.participants || {})) {
        const prev = knownParticipantsRef.current[uid];
        if (
          p.studentId &&
          prev &&
          prev.online &&
          !p.online &&
          (p as any).replacedByNewDevice
        ) {
          setDuplicateDeviceAlert(`${p.name} joined from another device`);
        }
      }
      knownParticipantsRef.current = room.participants || {};

      setLiveRoom(room);
    });

    return () => unsub();
  }, [roomCode]);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const dismissDuplicateAlert = useCallback(() => setDuplicateDeviceAlert(null), []);

  // Teacher starts live room
  const startRoom = useCallback(
    async (params: {
      sessionId: string;
      className: string;
      roster: LiveRosterStudent[];
      studentPins: Record<string, string>;
    }): Promise<string> => {
      if (!user) throw new Error("Teacher not logged in");

      const code = generateRoomCode();
      const room = await createLiveRoom({
        code,
        teacherUid: user.uid,
        sessionId: params.sessionId,
        className: params.className,
        roster: params.roster,
        studentPins: params.studentPins,
      });

      setRoomCode(code);
      setLiveRoom(room);
      if (typeof window !== "undefined") {
        localStorage.setItem(LIVE_ROOM_STORAGE_KEY, code);
      }
      return code;
    },
    [user],
  );

  // Teacher closes live room
  const closeRoom = useCallback(async () => {
    if (!roomCode) return;
    try {
      await endLiveRoom(roomCode);
    } catch (e) {
      console.warn("Error ending live room:", e);
    }
    setRoomCode(null);
    setLiveRoom(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(LIVE_ROOM_STORAGE_KEY);
    }
  }, [roomCode]);

  // Kick student
  const kickStudent = useCallback(
    async (uid: string) => {
      if (!roomCode) return;
      await kickParticipantRepo(roomCode, uid);
    },
    [roomCode],
  );

  // Toggle lock
  const toggleLock = useCallback(async () => {
    if (!roomCode || !liveRoom) return;
    await setRoomLockedRepo(roomCode, !liveRoom.locked);
  }, [roomCode, liveRoom]);

  // Toggle guests
  const toggleGuests = useCallback(async () => {
    if (!roomCode || !liveRoom) return;
    await setAllowGuestsRepo(roomCode, !liveRoom.allowGuests);
  }, [roomCode, liveRoom]);

  // Toggle leaderboard
  const toggleLeaderboard = useCallback(async () => {
    if (!roomCode || !liveRoom) return;
    await setHideLeaderboardRepo(roomCode, !liveRoom.hideLeaderboard);
  }, [roomCode, liveRoom]);

  // Launch activity (RF04, RF07, CA05, CA08)
  const launchActivity = useCallback(
    async (activity: { id: string; title: string; type: string; content: any }) => {
      if (!roomCode) return;

      const isPresentation =
        activity.type === "flashcards" || activity.type === "prompt-cards";

      let items: any[] = [];
      if (activity.type === "quiz") {
        items = activity.content?.questions || [];
      } else if (activity.type === "fill-blanks") {
        items = activity.content?.items || [];
      } else if (activity.type === "flashcards") {
        items = activity.content?.cards || [];
      } else if (activity.type === "prompt-cards") {
        items = activity.content?.cards || [];
      } else if (activity.type === "sentence-order") {
        items = activity.content?.items || [];
      }

      const itemIndex = 0;
      currentActivityRef.current = {
        id: activity.id,
        title: activity.title,
        type: activity.type,
        content: activity.content,
        items,
        itemIndex,
        startedAt: Date.now(),
      };

      if (isPresentation) {
        // RF07, CA08: presentation activities run only on teacher's screen
        await updateLiveRoomState(roomCode, {
          mode: "presentation",
          activityId: activity.id,
          activityTitle: activity.title,
          activityType: activity.type,
        });
        return;
      }

      // Quiz or Fill in the blanks
      const currentItem = items[0];
      let questionData: any = {};
      if (activity.type === "quiz" && currentItem) {
        questionData = {
          prompt: currentItem.prompt,
          options: currentItem.options?.map((o: any) => ({
            text: o.text,
            image: o.image,
          })),
          explanation: currentItem.explanation,
        };
      } else if (activity.type === "fill-blanks" && currentItem) {
        questionData = {
          prompt: currentItem.sentence || currentItem.text || "",
          blanksTemplate: currentItem.sentence || currentItem.text || "",
        };
      } else if (activity.type === "sentence-order" && currentItem) {
        questionData = sentenceOrderQuestion(currentItem);
      }

      await updateLiveRoomState(roomCode, {
        mode: "activity",
        activityId: activity.id,
        activityTitle: activity.title,
        activityType: activity.type,
        itemIndex: 0,
        totalItems: items.length,
        revealed: false,
        question: questionData,
      });
    },
    [roomCode],
  );

  // Reveal answer (RF04, CA06)
  const revealAnswer = useCallback(async () => {
    if (!roomCode || !currentActivityRef.current) return;
    const current = currentActivityRef.current;
    const currentItem = current.items[current.itemIndex];
    if (!currentItem) return;

    let correctAnswers: string[] = [];
    if (current.type === "quiz") {
      correctAnswers = (currentItem.options || [])
        .filter((o: any) => o.correct)
        .map((o: any) => o.text);
    } else if (current.type === "fill-blanks") {
      // Extracted answers from template or currentItem
      correctAnswers = currentItem.answers || [];
    } else if (current.type === "sentence-order") {
      correctAnswers = acceptedSentences(currentItem);
    }

    await revealCurrentQuestion({
      code: roomCode,
      itemIndex: current.itemIndex,
      activityType: current.type,
      correctAnswers,
      questionStartedAt: current.startedAt,
      durationSec: 30,
    });
  }, [roomCode]);

  // Next question
  const advanceQuestion = useCallback(async () => {
    if (!roomCode || !currentActivityRef.current) return;
    const current = currentActivityRef.current;
    const nextIdx = current.itemIndex + 1;

    if (nextIdx >= current.items.length) {
      // End of questions -> return to lobby
      await updateLiveRoomState(roomCode, {
        mode: "lobby",
        revealed: false,
        question: undefined,
      });
      currentActivityRef.current = null;
      return;
    }

    current.itemIndex = nextIdx;
    current.startedAt = Date.now();
    const currentItem = current.items[nextIdx];

    let questionData: any = {};
    if (current.type === "quiz" && currentItem) {
      questionData = {
        prompt: currentItem.prompt,
        options: currentItem.options?.map((o: any) => ({
          text: o.text,
          image: o.image,
        })),
        explanation: currentItem.explanation,
      };
    } else if (current.type === "fill-blanks" && currentItem) {
      questionData = {
        prompt: currentItem.sentence || currentItem.text || "",
        blanksTemplate: currentItem.sentence || currentItem.text || "",
      };
    } else if (current.type === "sentence-order" && currentItem) {
      questionData = sentenceOrderQuestion(currentItem);
    }

    await updateLiveRoomState(roomCode, {
      mode: "activity",
      itemIndex: nextIdx,
      revealed: false,
      question: questionData,
    });
  }, [roomCode]);

  const returnToLobby = useCallback(async () => {
    if (!roomCode) return;
    await updateLiveRoomState(roomCode, {
      mode: "lobby",
      revealed: false,
      question: undefined,
    });
    currentActivityRef.current = null;
  }, [roomCode]);

  // Mirror timer
  const syncTimer = useCallback(
    async (timerState: LiveRoomTimerState) => {
      if (!roomCode) return;
      await mirrorLiveTimer(roomCode, timerState);
    },
    [roomCode],
  );

  // Mirror picker
  const syncPicker = useCallback(
    async (pickedName: string) => {
      if (!roomCode) return;
      await mirrorLivePicker(roomCode, {
        name: pickedName,
        timestamp: Date.now(),
      });
    },
    [roomCode],
  );

  // Mirror board
  const syncBoard = useCallback(
    async (boardState: LiveRoomBoardState) => {
      if (!roomCode) return;
      await mirrorLiveBoard(roomCode, boardState);
    },
    [roomCode],
  );

  const toggleWhiteboard = useCallback(async () => {
    if (!roomCode || !liveRoom) return;
    const nextState = !isWhiteboardOpen;
    setIsWhiteboardOpen(nextState);
    if (nextState) {
      await updateLiveRoomState(roomCode, { mode: "whiteboard" });
    } else {
      await updateLiveRoomState(roomCode, { mode: "lobby" });
    }
  }, [roomCode, liveRoom, isWhiteboardOpen]);

  return (
    <LiveRoomContext.Provider
      value={{
        liveRoom,
        isLiveActive: Boolean(liveRoom && liveRoom.state.mode !== "ended"),
        roomCode,
        isModalOpen,
        openModal,
        closeModal,
        startRoom,
        closeRoom,
        kickStudent,
        toggleLock,
        toggleGuests,
        toggleLeaderboard,
        launchActivity,
        advanceQuestion,
        revealAnswer,
        returnToLobby,
        isTimerMirrored,
        setIsTimerMirrored,
        syncTimer,
        isPickerMirrored,
        setIsPickerMirrored,
        syncPicker,
        isBoardMirrored,
        setIsBoardMirrored,
        syncBoard,
        isWhiteboardOpen,
        toggleWhiteboard,
        duplicateDeviceAlert,
        dismissDuplicateAlert,
      }}
    >
      {children}
    </LiveRoomContext.Provider>
  );
}

export function useLiveRoom(): LiveRoomContextType | null {
  return useContext(LiveRoomContext);
}
