import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentInviteCard } from "@/components/portal/student-invite-card";
import { ToastProvider } from "@/components/ui/toast";
import type { Student } from "@/lib/classes/types";
import * as functions from "@/lib/functions";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqrcode"),
  },
}));

const mockStudent: Student = {
  id: "s1",
  teacherUid: "teacher-1",
  name: "Ana Silva",
  email: "ana@example.com",
  classIds: ["c1"],
  homeworkPin: "hash1234",
  createdAt: new Date(),
};

describe("StudentInviteCard (spec 03: RF01, RF08, CA01, CA07, CT01, CT06)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates invite with 8-char code, link, QR code, and 'Expires in 14 days' (CA01, CT01)", async () => {
    vi.spyOn(functions, "callGetStudentInvite").mockResolvedValue({ active: false });
    vi.spyOn(functions, "callCreateStudentInvite").mockResolvedValue({
      code: "ABCD2345",
      studentId: "s1",
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
      expiresInDays: 14,
    });

    render(
      <ToastProvider>
        <StudentInviteCard student={mockStudent} />
      </ToastProvider>,
    );

    const inviteBtn = await screen.findByRole("button", {
      name: /Invite to student portal/i,
    });
    expect(inviteBtn).toBeInTheDocument();

    await userEvent.click(inviteBtn);

    // Shows 8-character code (CA01)
    await waitFor(() => {
      expect(screen.getByText("ABCD2345")).toBeInTheDocument();
    });

    // Shows link with code
    const linkInput = screen.getByLabelText(/Invite link/i) as HTMLInputElement;
    expect(linkInput.value).toContain("/join?code=ABCD2345");

    // Shows "Expires in 14 days" (CA01)
    expect(screen.getByText(/Expires in 14 days/i)).toBeInTheDocument();

    // Shows QR Code image
    const qrImg = screen.getByRole("img", { name: /QR code for Ana Silva/i });
    expect(qrImg).toBeInTheDocument();
  });

  it("shows active invite on load if already generated", async () => {
    vi.spyOn(functions, "callGetStudentInvite").mockResolvedValue({
      active: true,
      code: "EXIST123",
      expiresAt: Date.now() + 100000,
    });

    render(
      <ToastProvider>
        <StudentInviteCard student={mockStudent} />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("EXIST123")).toBeInTheDocument();
    });

    expect(screen.getByText(/Expires in 14 days/i)).toBeInTheDocument();
  });

  it("shows connected status and allows removing portal access (RF08, CA07, CT06)", async () => {
    const studentWithPortal: Student = {
      ...mockStudent,
      portalUid: "student-portal-user-1",
    };

    const removeSpy = vi
      .spyOn(functions, "callRemovePortalAccess")
      .mockResolvedValue({ success: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onUpdatedMock = vi.fn();

    render(
      <ToastProvider>
        <StudentInviteCard student={studentWithPortal} onStudentUpdated={onUpdatedMock} />
      </ToastProvider>,
    );

    expect(screen.getByText(/Connected to portal/i)).toBeInTheDocument();
    const removeBtn = screen.getByRole("button", { name: /Remove portal access/i });
    expect(removeBtn).toBeInTheDocument();

    await userEvent.click(removeBtn);

    expect(removeSpy).toHaveBeenCalledWith("s1");
    expect(onUpdatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ portalUid: undefined }),
    );
  });
});
