/**
 * Alphabet excluding ambiguous characters (0, O, 1, I, L) for easy student entry.
 */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

/**
 * Generates a clean, unambiguous 6-character room code (RF01).
 */
export function generateRoomCode(): string {
  let result = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    result += ROOM_CODE_ALPHABET[randomIndex];
  }
  return result;
}

/**
 * Normalizes input code: uppercase, trim, removes dashes or spaces.
 */
export function normalizeRoomCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Checks if code format is valid (6 uppercase characters from unambiguous alphabet).
 */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((char) => ROOM_CODE_ALPHABET.includes(char));
}

/**
 * Generates ready-to-paste invitation text for Meet or Zoom chat (RF01, CA01).
 */
export function generateInviteText(code: string, origin: string = ""): string {
  const url = `${origin || "https://funenglish.app"}/live?code=${code}`;
  return `Join our live class on Fun English!\nLink: ${url}\nRoom Code: ${code}`;
}
