import { describe, expect, it } from "vitest";
import {
  generateInviteText,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "@/lib/live/code";

describe("Live Room Code & Invite Utils (RF01, CA01)", () => {
  it("generates a 6-character room code without ambiguous characters (0, O, 1, I, L)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET).toContain(char);
        expect(["0", "O", "1", "I", "L"]).not.toContain(char);
      }
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it("normalizes room code by stripping dashes, spaces and converting to uppercase", () => {
    expect(normalizeRoomCode("k7-p9 x2")).toBe("K7P9X2");
    expect(normalizeRoomCode(" abc-def ")).toBe("ABCDEF");
  });

  it("validates room code format correctly", () => {
    expect(isValidRoomCode("K7P9X2")).toBe(true);
    expect(isValidRoomCode("ABCDEF")).toBe(true);
    expect(isValidRoomCode("ABCD")).toBe(false); // too short
    expect(isValidRoomCode("ABCDEFG")).toBe(false); // too long
    expect(isValidRoomCode("ABCDE0")).toBe(false); // contains '0'
    expect(isValidRoomCode("ABCDEI")).toBe(false); // contains 'I'
  });

  it("generates ready-to-paste invite text with link and code (CA01)", () => {
    const invite = generateInviteText("K7P9X2", "https://funenglish.app");
    expect(invite).toContain("https://funenglish.app/live?code=K7P9X2");
    expect(invite).toContain("Room Code: K7P9X2");
  });
});
