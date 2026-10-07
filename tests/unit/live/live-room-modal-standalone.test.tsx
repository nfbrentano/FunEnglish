import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveRoomModal } from "@/components/live/live-room-modal";

/** SDD/2026-10-06_sala-ao-vivo-sem-aula.md */

const startRoom = vi.fn();
let activeSession: Record<string, unknown> | null = null;

vi.mock("@/lib/live/live-context", () => ({
  useLiveRoom: () => ({
    isModalOpen: true,
    isLiveActive: false,
    liveRoom: null,
    startRoom,
    closeModal: vi.fn(),
  }),
}));

vi.mock("@/lib/session/session-context", () => ({
  useSessionContext: () => ({ activeSession }),
}));

vi.mock("@/lib/classes/use-classes", () => ({
  useClasses: () => ({
    students: [
      { id: "s1", name: "Ana Silva", classIds: ["c1"], homeworkPin: "hash-1" },
      { id: "s2", name: "Bruno Costa", classIds: ["c2"] },
    ],
  }),
}));

describe("LiveRoomModal outside a class", () => {
  beforeEach(() => {
    startRoom.mockReset();
    activeSession = null;
  });

  it("CT01 / CA01: opens a whiteboard room with every student and guests allowed", async () => {
    startRoom.mockResolvedValue("ABCDEF");
    render(<LiveRoomModal />);

    expect(screen.getByText("Open a live room for the whiteboard")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open live room" }));

    expect(startRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "",
        className: "Whiteboard",
        allowGuests: true,
        studentPins: { s1: "hash-1" },
      }),
    );
    expect(startRoom.mock.calls[0][0].roster).toHaveLength(2);
  });

  it("CT02 / CA02: inside a class keeps the class roster and guests off", async () => {
    activeSession = { id: "sess-1", classId: "c1", className: "Teens B1" };
    startRoom.mockResolvedValue("ABCDEF");
    render(<LiveRoomModal />);

    await userEvent.click(screen.getByRole("button", { name: "Open live room" }));

    const params = startRoom.mock.calls[0][0];
    expect(params).toMatchObject({
      sessionId: "sess-1",
      className: "Teens B1",
      allowGuests: false,
    });
    expect(params.roster.map((s: { studentId: string }) => s.studentId)).toEqual(["s1"]);
  });

  it("CT03 / CA03: a failure shows a message and enables the button again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    startRoom.mockRejectedValue(new Error("offline"));
    render(<LiveRoomModal />);

    await userEvent.click(screen.getByRole("button", { name: "Open live room" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't open the live room");
    expect(screen.getByRole("button", { name: "Open live room" })).toBeEnabled();
  });
});
