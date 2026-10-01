export const DEFAULT_AFTER_LOGIN = "/activities";

/** Only same-site paths are allowed after login, never another domain (open redirect). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  try {
    const url = new URL(next, "https://fun-english.invalid");
    return url.origin === "https://fun-english.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : DEFAULT_AFTER_LOGIN;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
