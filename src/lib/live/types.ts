export type LiveRoomMode =
  | "lobby"
  | "activity"
  | "presentation"
  | "tool_timer"
  | "tool_picker"
  | "tool_board"
  | "whiteboard"
  | "ended";

export type ParticipantVia = "pin" | "portal" | "guest";

export interface LiveRosterStudent {
  studentId: string;
  firstName: string;
  fullName: string;
  portalUid?: string;
}

export interface LiveParticipant {
  uid: string;
  studentId?: string;
  name: string;
  via: ParticipantVia;
  pinHash?: string;
  online: boolean;
  joinedAt: number;
  score: number;
  deviceId?: string;
}

export interface LiveAnswer {
  value: string;
  at: number;
  correct?: boolean;
  pointsAwarded?: number;
}

export interface LiveQuestionChoice {
  text: string;
  image?: {
    src: string;
    alt?: string;
  };
}

export interface LiveCurrentQuestion {
  prompt: string;
  options?: LiveQuestionChoice[];
  explanation?: string;
  /** Fill-in-the-blanks template, e.g. "She [[has|'s]] lived here." or text with gaps */
  blanksTemplate?: string;
  /** Presentation cards (flashcards/prompt-cards) */
  presentationTitle?: string;
  presentationCard?: {
    front?: { text?: string; image?: { src: string; alt?: string } };
    back?: { text: string; definition?: string; example?: string };
  };
}

export interface LiveRoomTimerState {
  endsAt: number; // server timestamp in ms
  durationSec: number;
  pausedRemaining?: number;
  running: boolean;
}

export interface LiveRoomPickedState {
  name: string;
  timestamp: number;
}

export interface LiveRoomBoardState {
  updatedAt: number;
  strokes?: any[];
  images?: any[];
  text?: string;
}

export interface LiveRoomState {
  mode: LiveRoomMode;
  activityId?: string;
  activityType?: string;
  activityTitle?: string;
  itemIndex?: number;
  totalItems?: number;
  revealed?: boolean;
  question?: LiveCurrentQuestion;
  timer?: LiveRoomTimerState;
  picked?: LiveRoomPickedState;
  board?: LiveRoomBoardState;
}

export interface LiveRoom {
  code: string;
  teacherUid: string;
  sessionId: string;
  className: string;
  locked: boolean;
  allowGuests: boolean;
  hideLeaderboard: boolean;
  createdAt: number;
  state: LiveRoomState;
  roster: Record<string, LiveRosterStudent>;
  participants: Record<string, LiveParticipant>;
  answers: Record<string, Record<string, LiveAnswer>>;
}

export interface LiveActivitySummaryItem {
  activityId: string;
  activityTitle: string;
  type: string;
  totalQuestions: number;
  scoresByStudent: Record<
    string,
    {
      studentName: string;
      correctCount: number;
      totalAnswered: number;
      points: number;
    }
  >;
}
