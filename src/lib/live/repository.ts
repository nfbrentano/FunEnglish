import { get, onDisconnect, onValue, ref, set, update } from "firebase/database";
import { loadAuth } from "../auth/firebase-auth";
import { hashHomeworkPin } from "../classes/pin";
import { getDatabaseInstance } from "../firebase";
import { isBlankCorrect } from "../activities/blanks";
import { normalizeSentence } from "../activities/sentence-order";
import { calculateAnswerPoints } from "./scoring";
import type {
  LiveAnswer,
  LiveParticipant,
  LiveQuestionChoice,
  LiveRoom,
  LiveRoomBoardState,
  LiveRoomMode,
  LiveRoomPickedState,
  LiveRoomState,
  LiveRoomTimerState,
  LiveRosterStudent,
} from "./types";

export const MAX_ROOM_PARTICIPANTS = 40;

/**
 * Creates a new live room in Firebase Realtime Database (RF01, RNF01).
 */
export async function createLiveRoom(params: {
  code: string;
  teacherUid: string;
  sessionId: string;
  className: string;
  roster: LiveRosterStudent[];
  studentPins: Record<string, string>; // studentId -> hashedPin
  /** Rooms opened from the standalone whiteboard let students in with just the code. */
  allowGuests?: boolean;
}): Promise<LiveRoom> {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${params.code}`);
  const pinsRef = ref(db, `liveRoomPins/${params.code}`);

  const rosterMap: Record<string, LiveRosterStudent> = {};
  for (const student of params.roster) {
    rosterMap[student.studentId] = student;
  }

  const initialRoom: LiveRoom = {
    code: params.code,
    teacherUid: params.teacherUid,
    sessionId: params.sessionId,
    className: params.className,
    locked: false,
    allowGuests: params.allowGuests ?? false,
    hideLeaderboard: false,
    createdAt: Date.now(),
    state: {
      mode: "lobby",
    },
    roster: rosterMap,
    participants: {},
    answers: {},
  };

  // Write live room and hidden PIN hashes concurrently
  await Promise.all([set(roomRef, initialRoom), set(pinsRef, params.studentPins)]);

  return initialRoom;
}

let pendingLiveAuth: Promise<string> | null = null;

/**
 * Room reads need a signed-in user (database.rules.json): wait for a saved session to be restored,
 * then fall back to anonymous sign-in for students without an account
 * (SDD/2026-10-06_entrada-do-aluno-na-sala-ao-vivo.md).
 */
export function ensureLiveAuth(): Promise<string> {
  pendingLiveAuth ??= (async () => {
    const { auth, sdk } = await loadAuth();
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await sdk.signInAnonymously(auth);
    return cred.user.uid;
  })().finally(() => {
    pendingLiveAuth = null;
  });
  return pendingLiveAuth;
}

/**
 * Subscribes to full live room updates in real-time, once a user is signed in.
 * `onError` runs when signing in fails; without it the callback gets null.
 */
export function subscribeLiveRoom(
  code: string,
  callback: (room: LiveRoom | null) => void,
  onError?: (err: unknown) => void,
): () => void {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${code}`);
  let cancelled = false;
  let unsubscribe = () => {};

  ensureLiveAuth()
    .then(() => {
      if (cancelled) return;
      unsubscribe = subscribe();
    })
    .catch((err) => {
      console.warn("Failed signing in to the live room:", err);
      if (cancelled) return;
      if (onError) onError(err);
      else callback(null);
    });

  const subscribe = () =>
    onValue(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const room: LiveRoom = {
            code: val.code || code,
            teacherUid: val.teacherUid || "",
            sessionId: val.sessionId || "",
            className: val.className || "Class",
            locked: Boolean(val.locked),
            allowGuests: Boolean(val.allowGuests),
            hideLeaderboard: Boolean(val.hideLeaderboard),
            createdAt: val.createdAt || Date.now(),
            state: val.state || { mode: "lobby" },
            roster: val.roster || {},
            participants: val.participants || {},
            answers: val.answers || {},
          };
          callback(room);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn("Failed subscribing to live room:", err);
        callback(null);
      },
    );

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

/**
 * Subscribes to Firebase RTDB server time offset (RNF06).
 */
export function subscribeServerTimeOffset(callback: (offsetMs: number) => void): () => void {
  const db = getDatabaseInstance();
  const offsetRef = ref(db, ".info/serverTimeOffset");

  const unsubscribe = onValue(offsetRef, (snap) => {
    callback(snap.val() || 0);
  });

  return () => unsubscribe();
}

export type JoinLiveRoomResult =
  | { success: true; participant: LiveParticipant }
  | {
      success: false;
      error: "NOT_FOUND" | "LOCKED" | "FULL" | "WRONG_PIN" | "GUESTS_DISABLED" | "UNKNOWN";
    };

/**
 * Student joins or reconnects to a live room (RF02, CA02, CA03, CA10, CA13, CA14).
 */
export async function joinLiveRoom(params: {
  code: string;
  name: string;
  studentId?: string;
  pin?: string;
  portalUid?: string;
  isGuest?: boolean;
  deviceId?: string;
}): Promise<JoinLiveRoomResult> {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${params.code}`);
  // Sign in first: reading the room is denied to visitors without a user.
  const uid = await ensureLiveAuth();
  const snap = await get(roomRef);

  if (!snap.exists()) {
    return { success: false, error: "NOT_FOUND" };
  }

  const room = snap.val() as LiveRoom;

  // Check if locked (CA04)
  if (room.locked) {
    return { success: false, error: "LOCKED" };
  }

  // Count existing participants (CA14)
  const currentParticipants = Object.values(room.participants || {});
  if (currentParticipants.length >= MAX_ROOM_PARTICIPANTS) {
    // If reconnecting with same studentId, allow
    const existing = params.studentId
      ? currentParticipants.find((p) => p.studentId === params.studentId)
      : undefined;
    if (!existing) {
      return { success: false, error: "FULL" };
    }
  }

  let via: "pin" | "portal" | "guest" = "guest";
  let pinHash: string | undefined;

  if (params.studentId) {
    // Joining as a roster student
    const rosterStudent = room.roster?.[params.studentId];
    if (!rosterStudent) {
      return { success: false, error: "NOT_FOUND" };
    }

    if (params.portalUid && rosterStudent.portalUid === params.portalUid) {
      via = "portal";
    } else {
      // Must provide valid PIN
      if (!params.pin) {
        return { success: false, error: "WRONG_PIN" };
      }
      pinHash = await hashHomeworkPin(params.pin);

      // Verify PIN against liveRoomPins (or DB rule will reject write)
      const pinRef = ref(db, `liveRoomPins/${params.code}/${params.studentId}`);
      const pinSnap = await get(pinRef);
      if (pinSnap.exists() && pinSnap.val() !== pinHash) {
        return { success: false, error: "WRONG_PIN" };
      }
      via = "pin";
    }
  } else {
    // Free guest entry
    if (!room.allowGuests) {
      return { success: false, error: "GUESTS_DISABLED" };
    }
    via = "guest";
  }

  // Check for duplicate device with same studentId (CA13)
  if (params.studentId) {
    for (const [otherUid, otherParticipant] of Object.entries(room.participants || {})) {
      if (otherParticipant.studentId === params.studentId && otherUid !== uid) {
        // Disconnect previous device
        const prevRef = ref(db, `liveRooms/${params.code}/participants/${otherUid}`);
        await update(prevRef, { online: false, replacedByNewDevice: true });
      }
    }
  }

  // Preserve existing score if reconnecting
  const existingScore = room.participants?.[uid]?.score || 0;

  const participantData: LiveParticipant = {
    uid,
    studentId: params.studentId,
    name: params.name.trim(),
    via,
    pinHash,
    online: true,
    joinedAt: Date.now(),
    score: existingScore,
    deviceId: params.deviceId,
  };

  const participantRef = ref(db, `liveRooms/${params.code}/participants/${uid}`);
  // The Realtime Database rejects undefined values (a guest has no studentId or pinHash).
  await set(
    participantRef,
    Object.fromEntries(Object.entries(participantData).filter(([, value]) => value !== undefined)),
  );

  // Set onDisconnect presence
  onDisconnect(participantRef).update({ online: false });

  return { success: true, participant: participantData };
}

/**
 * Teacher kicks a participant from the room (RF03, CA04).
 */
export async function kickParticipant(code: string, participantUid: string): Promise<void> {
  const db = getDatabaseInstance();
  const pRef = ref(db, `liveRooms/${code}/participants/${participantUid}`);
  await update(pRef, { online: false, kicked: true });
}

/**
 * Teacher locks or unlocks the live room (RF03, CA04).
 */
export async function setRoomLocked(code: string, locked: boolean): Promise<void> {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${code}`);
  await update(roomRef, { locked });
}

/**
 * Teacher allows or disallows guests (RF02).
 */
export async function setAllowGuests(code: string, allowGuests: boolean): Promise<void> {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${code}`);
  await update(roomRef, { allowGuests });
}

/**
 * Teacher toggles leaderboard visibility (RF05, CA07).
 */
export async function setHideLeaderboard(code: string, hideLeaderboard: boolean): Promise<void> {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${code}`);
  await update(roomRef, { hideLeaderboard });
}

/**
 * Updates live room state (teacher control) (RF04, RF07, RF09).
 */
export async function updateLiveRoomState(
  code: string,
  state: Partial<LiveRoomState> | LiveRoomState,
): Promise<void> {
  const db = getDatabaseInstance();
  const stateRef = ref(db, `liveRooms/${code}/state`);
  await update(stateRef, state);
}

/**
 * Student submits an answer to the current question (RF04, RF06, CA05, CA06, CA12).
 */
export async function submitLiveAnswer(params: {
  code: string;
  itemIndex: number;
  value: string;
}): Promise<{ success: boolean; error?: string }> {
  const { auth } = await loadAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return { success: false, error: "NOT_AUTHENTICATED" };

  const db = getDatabaseInstance();
  const stateSnap = await get(ref(db, `liveRooms/${params.code}/state`));
  if (!stateSnap.exists()) return { success: false, error: "ROOM_NOT_FOUND" };

  const state = stateSnap.val() as LiveRoomState;
  if (state.mode !== "activity" || state.itemIndex !== params.itemIndex) {
    return { success: false, error: "WRONG_QUESTION" };
  }
  if (state.revealed) {
    return { success: false, error: "ALREADY_REVEALED" };
  }

  const answerRef = ref(
    db,
    `liveRooms/${params.code}/answers/${params.itemIndex}/${currentUser.uid}`,
  );

  // Prevent multiple answers from same user
  const existing = await get(answerRef);
  if (existing.exists()) {
    return { success: false, error: "ALREADY_ANSWERED" };
  }

  const answer: LiveAnswer = {
    value: params.value.slice(0, 200),
    at: Date.now(),
  };

  await set(answerRef, answer);
  return { success: true };
}

/**
 * Teacher reveals answer, grades student submissions and updates participant scores (RF04, RF05, CA06).
 */
export async function revealCurrentQuestion(params: {
  code: string;
  itemIndex: number;
  activityType: string;
  correctAnswers: string[]; // For quiz: text of correct choice(s); For fill-blanks: accepted answers
  questionStartedAt?: number;
  durationSec?: number;
}): Promise<{
  revealed: true;
  totalAnswered: number;
  correctCount: number;
  distribution: Record<string, number>;
}> {
  const db = getDatabaseInstance();
  const roomSnap = await get(ref(db, `liveRooms/${params.code}`));
  if (!roomSnap.exists()) {
    throw new Error("Room does not exist");
  }

  const room = roomSnap.val() as LiveRoom;
  const answersMap = room.answers?.[params.itemIndex] || {};
  const participants = room.participants || {};

  let correctCount = 0;
  const distribution: Record<string, number> = {};
  const participantUpdates: Record<string, any> = {};
  const answerUpdates: Record<string, any> = {};

  for (const [uid, ans] of Object.entries(answersMap)) {
    const studentVal = (ans.value || "").trim();
    distribution[studentVal] = (distribution[studentVal] || 0) + 1;

    let isCorrect = false;
    if (params.activityType === "fill-blanks") {
      isCorrect = isBlankCorrect(studentVal, params.correctAnswers);
    } else if (params.activityType === "sentence-order") {
      const built = normalizeSentence(studentVal);
      isCorrect = built !== "" && params.correctAnswers.some((s) => normalizeSentence(s) === built);
    } else {
      isCorrect = params.correctAnswers.some(
        (correct) => correct.toLowerCase().trim() === studentVal.toLowerCase(),
      );
    }

    if (isCorrect) correctCount++;

    const points = calculateAnswerPoints(
      isCorrect,
      ans.at,
      params.questionStartedAt,
      params.durationSec || 30,
    );

    answerUpdates[`liveRooms/${params.code}/answers/${params.itemIndex}/${uid}/correct`] =
      isCorrect;
    answerUpdates[`liveRooms/${params.code}/answers/${params.itemIndex}/${uid}/pointsAwarded`] =
      points;

    const currentScore = participants[uid]?.score || 0;
    participantUpdates[`liveRooms/${params.code}/participants/${uid}/score`] =
      currentScore + points;
  }

  // Mark question revealed in room state
  answerUpdates[`liveRooms/${params.code}/state/revealed`] = true;

  // Commit atomic updates
  await update(ref(db), {
    ...answerUpdates,
    ...participantUpdates,
  });

  return {
    revealed: true,
    totalAnswered: Object.keys(answersMap).length,
    correctCount,
    distribution,
  };
}

/**
 * Mirror timer to live room (RF09, CA09).
 */
export async function mirrorLiveTimer(code: string, timerState: LiveRoomTimerState): Promise<void> {
  const db = getDatabaseInstance();
  await update(ref(db, `liveRooms/${code}/state`), {
    mode: "tool_timer",
    timer: timerState,
  });
}

/**
 * Mirror random picker result to live room (RF09, CA09).
 */
export async function mirrorLivePicker(code: string, picked: LiveRoomPickedState): Promise<void> {
  const db = getDatabaseInstance();
  await update(ref(db, `liveRooms/${code}/state`), {
    mode: "tool_picker",
    picked,
  });
}

/**
 * Mirror whiteboard content to live room (RF09, CA09).
 */
export async function mirrorLiveBoard(code: string, board: LiveRoomBoardState): Promise<void> {
  const db = getDatabaseInstance();
  await update(ref(db, `liveRooms/${code}/state`), {
    mode: "tool_board",
    board,
  });
}

/**
 * Ends the live room (RF12, CA11).
 */
export async function endLiveRoom(code: string): Promise<LiveRoom> {
  const db = getDatabaseInstance();
  const roomRef = ref(db, `liveRooms/${code}`);
  await update(ref(db, `liveRooms/${code}/state`), {
    mode: "ended",
  });

  const snap = await get(roomRef);
  return snap.val() as LiveRoom;
}
