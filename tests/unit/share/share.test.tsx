import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShareButton } from "@/components/share/share-button";
import { isGroupActivity, studentShareUrl } from "@/lib/share/share-url";

describe("studentShareUrl", () => {
  it("points to the player in student mode", () => {
    expect(studentShareUrl("some-or-any", "https://fun-english.web.app")).toBe(
      "https://fun-english.web.app/play/some-or-any?mode=student",
    );
  });

  it("flags the whole-class types", () => {
    expect(isGroupActivity("quiz-board")).toBe(true);
    expect(isGroupActivity("prompt-cards")).toBe(true);
    expect(isGroupActivity("quiz")).toBe(false);
  });
});

const quiz = { title: "Some or Any", slug: "some-or-any", type: "quiz" as const };
const URL_TEXT = `${window.location.origin}/play/some-or-any?mode=student`;

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

async function openShare(activity: Parameters<typeof ShareButton>[0]["activity"] = quiz) {
  const user = userEvent.setup();
  render(
    <ShareButton activity={activity} className="">
      share
    </ShareButton>,
  );
  await user.click(screen.getByRole("button", { name: "Share: Some or Any" }));
  return user;
}

describe("ShareButton", () => {
  it("opens a dialog with the student link and a QR code (CA01)", async () => {
    await openShare();
    const dialog = screen.getByRole("dialog", { name: "Share with students" });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: "Student link" })).toHaveValue(URL_TEXT);
    const qr = screen.getByRole("img", { name: "QR code for Some or Any", hidden: false });
    await vi.waitFor(() => expect(qr.querySelector("svg")).not.toBeNull());
    expect(screen.queryByText(/Best used in class/)).not.toBeInTheDocument();
  });

  it("copies the link and says Copied! for 2 seconds (CA02)", async () => {
    const writeText = vi.fn(async () => {});
    const user = await openShare();
    setClipboard(writeText); // after userEvent.setup(), which installs its own clipboard

    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(URL_TEXT);
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

    // Back to "Copy link" after 2 s (real timers: fake ones were flaky on CI).
    expect(
      await screen.findByRole("button", { name: "Copy link" }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("without clipboard permission, selects the link and explains the shortcut (CA08)", async () => {
    const user = await openShare();
    setClipboard(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });

    await user.click(screen.getByRole("button", { name: "Copy link" }));
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Student link" });
    expect(screen.getByRole("status")).toHaveTextContent(/Press (Ctrl\+C|⌘C) to copy/);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(URL_TEXT.length);
  });

  it("offers the native share sheet when the browser has one (CA04)", async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const user = await openShare();

    await user.click(screen.getByRole("button", { name: "Share…" }));
    expect(share).toHaveBeenCalledWith({ title: "Some or Any", url: URL_TEXT });
    Reflect.deleteProperty(navigator, "share");
  });

  it("warns that whole-class games are best used in class (D01)", async () => {
    await openShare({ ...quiz, type: "quiz-board" });
    expect(screen.getByText(/Best used in class/)).toBeInTheDocument();
  });
});
