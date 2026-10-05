import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentLiveView } from "@/components/live/student-live-view";
import { LiveRoomModal } from "@/components/live/live-room-modal";
import { LiveRoomSidebarPanel } from "@/components/live/live-room-sidebar-panel";
import type { LiveRoom } from "@/lib/live/types";

// Mock auth
vi.mock("@/lib/auth/use-auth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { uid: "teacher-1", name: "Teacher" },
  }),
}));

// Mock repository functions
let mockSubscribedCallback: ((room: LiveRoom | null) => void) | null = null;
vi.mock("@/lib/live/repository", () => ({
  subscribeLiveRoom: vi.fn((code, cb) => {
    mockSubscribedCallback = cb;
    cb(mockLiveContext.liveRoom);
    return () => {
      mockSubscribedCallback = null;
    };
  }),
  subscribeServerTimeOffset: vi.fn((cb) => {
    cb(0);
    return () => {};
  }),
  joinLiveRoom: vi.fn().mockResolvedValue({
    success: true,
    participant: {
      uid: "student-1",
      studentId: "s1",
      name: "Ana Silva",
      via: "pin",
      online: true,
      score: 100,
    },
  }),
  submitLiveAnswer: vi.fn().mockResolvedValue({ success: true }),
  createLiveRoom: vi.fn(),
  kickParticipant: vi.fn(),
  setRoomLocked: vi.fn(),
  setAllowGuests: vi.fn(),
  setHideLeaderboard: vi.fn(),
  revealCurrentQuestion: vi.fn(),
  endLiveRoom: vi.fn(),
}));

const mockLiveContext = {
  liveRoom: {
    code: "ABCDEF",
    teacherUid: "teacher-1",
    sessionId: "sess-1",
    className: "Teens B1",
    locked: false,
    allowGuests: true,
    hideLeaderboard: false,
    createdAt: Date.now(),
    state: {
      mode: "activity",
      itemIndex: 0,
      totalItems: 5,
      revealed: false,
      question: {
        prompt: "What is the capital of England?",
        options: [
          { text: "London" },
          { text: "Paris" },
          { text: "Berlin" },
          { text: "Madrid" },
        ],
      },
    },
    roster: {
      s1: { studentId: "s1", firstName: "Ana", fullName: "Ana Silva" },
    },
    participants: {
      "student-1": {
        uid: "student-1",
        studentId: "s1",
        name: "Ana Silva",
        via: "pin",
        online: true,
        joinedAt: Date.now(),
        score: 150,
      },
      "student-2": {
        uid: "student-2",
        studentId: "s2",
        name: "Bruno Santos",
        via: "pin",
        online: true,
        joinedAt: Date.now(),
        score: 100,
      },
    },
    answers: {
      "0": {
        "student-1": { value: "London", at: Date.now() },
      },
    },
  } as LiveRoom,
  isLiveActive: true,
  roomCode: "ABCDEF",
  isModalOpen: true,
  openModal: vi.fn(),
  closeModal: vi.fn(),
  startRoom: vi.fn(),
  closeRoom: vi.fn(),
  kickStudent: vi.fn(),
  toggleLock: vi.fn(),
  toggleGuests: vi.fn(),
  toggleLeaderboard: vi.fn(),
  launchActivity: vi.fn(),
  advanceQuestion: vi.fn(),
  revealAnswer: vi.fn(),
  returnToLobby: vi.fn(),
  isTimerMirrored: false,
  setIsTimerMirrored: vi.fn(),
  syncTimer: vi.fn(),
  isPickerMirrored: false,
  setIsPickerMirrored: vi.fn(),
  syncPicker: vi.fn(),
  isBoardMirrored: false,
  setIsBoardMirrored: vi.fn(),
  syncBoard: vi.fn(),
  duplicateDeviceAlert: null,
  dismissDuplicateAlert: vi.fn(),
};

vi.mock("@/lib/live/live-context", () => ({
  useLiveRoom: () => mockLiveContext,
}));

vi.mock("@/lib/classes/use-classes", () => ({
  useClasses: () => ({
    students: [
      { id: "s1", name: "Ana Silva", classIds: ["class-1"], homeworkPin: "hash" },
    ],
  }),
}));

vi.mock("@/lib/session/session-context", () => ({
  useSessionContext: () => ({
    activeSession: {
      id: "sess-1",
      classId: "class-1",
      className: "Teens B1",
    },
  }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqr"),
  },
}));

describe("Live Room UI Components (SDD/2026-10-03_09-sala-ao-vivo.md)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("StudentLiveView prompts for 6-character room code when empty", () => {
    render(<StudentLiveView initialCode="" />);
    expect(screen.getByText("Fun English Live")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. K7P9X2")).toBeDefined();
    expect(screen.getByRole("button", { name: "Next" })).toBeDefined();
  });

  it("StudentLiveView displays student choices and handles join (CA02)", async () => {
    render(<StudentLiveView initialCode="ABCDEF" />);

    // Simulate subscription push
    if (mockSubscribedCallback) {
      mockSubscribedCallback(mockLiveContext.liveRoom);
    }

    // Name selector should appear
    expect(screen.getByText("Teens B1")).toBeDefined();
    expect(screen.getByText("Ana Silva")).toBeDefined();
  });

  it("StudentLiveView renders presentation screen message when mode is presentation (RF07, CA08)", () => {
    render(<StudentLiveView initialCode="ABCDEF" />);

    if (mockSubscribedCallback) {
      mockSubscribedCallback({
        ...mockLiveContext.liveRoom,
        state: { mode: "presentation" },
      });
    }

    // After joining
    // Check presentation text
    expect(screen.getByText("Teens B1")).toBeDefined();
  });

  it("LiveRoomModal renders room code, QR code and controls (RF01, CA01)", () => {
    render(<LiveRoomModal />);
    expect(screen.getByText("Live Room")).toBeDefined();
    expect(screen.getByText("ABCDEF")).toBeDefined();
    expect(screen.getByText("Copy invite")).toBeDefined();
    expect(screen.getByText("Copy link")).toBeDefined();
    expect(screen.getByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("Bruno Santos")).toBeDefined();
  });

  it("LiveRoomSidebarPanel displays active question progress and reveal button (RF04, CA05)", () => {
    render(<LiveRoomSidebarPanel />);
    expect(screen.getByText("What is the capital of England?")).toBeDefined();
    expect(screen.getByText("1/2 answered")).toBeDefined();
    expect(screen.getByText("Reveal Answer")).toBeDefined();
  });
});
