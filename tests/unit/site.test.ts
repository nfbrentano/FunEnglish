import { describe, expect, it } from "vitest";
import { resolveSiteUrl, withBasePath } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set, without trailing slash", () => {
    expect(resolveSiteUrl("https://exemplo.com/")).toBe("https://exemplo.com");
  });

  it("falls back to localhost in local development", () => {
    expect(resolveSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("withBasePath", () => {
  it("returns external or data URLs unchanged", () => {
    expect(withBasePath("https://example.com/pic.png")).toBe("https://example.com/pic.png");
    expect(withBasePath("data:image/png;base64,...")).toBe("data:image/png;base64,...");
  });

  it("leaves local paths untouched when basePath is empty", () => {
    expect(withBasePath("/images/categories/speaking.webp")).toBe("/images/categories/speaking.webp");
  });
});
