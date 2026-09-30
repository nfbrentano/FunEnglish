import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set, without trailing slash", () => {
    expect(resolveSiteUrl("https://exemplo.com/", "fun-english.vercel.app")).toBe(
      "https://exemplo.com",
    );
  });

  it("falls back to the Vercel production domain", () => {
    expect(resolveSiteUrl(undefined, "fun-english.vercel.app")).toBe(
      "https://fun-english.vercel.app",
    );
  });

  it("falls back to localhost in local development", () => {
    expect(resolveSiteUrl()).toBe("http://localhost:3000");
  });
});
