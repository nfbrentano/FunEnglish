import { strings } from "../strings";

/** Friendly English message for a Firebase Auth error code (spec: autenticação, RF07). */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return strings.auth.errors.emailInUse;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return strings.auth.errors.wrongCredentials;
    case "auth/weak-password":
      return strings.auth.errors.weakPassword;
    case "auth/invalid-email":
      return strings.auth.errors.invalidEmail;
    case "auth/too-many-requests":
      return strings.auth.errors.tooManyRequests;
    case "auth/network-request-failed":
      return strings.auth.errors.network;
    case "auth/popup-blocked":
      return strings.auth.errors.popupBlocked;
    default:
      return strings.auth.errors.generic;
  }
}

/** The user closed the Google window: not an error worth showing. */
export function isCancelled(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}
