import { afterEach, describe, expect, it, vi } from "vitest";
import {
  commitFiles,
  forgetToken,
  readToken,
  repoPathFor,
  saveToken,
  verifyToken,
} from "@/lib/admin/github";
import {
  encodeUnderLimit,
  ImageTooLargeError,
  kindForSrc,
  MAX_IMAGE_BYTES,
  planResize,
  srcForFileName,
  WebpUnsupportedError,
} from "@/lib/admin/image-processing";

type Call = { url: string; method: string; body?: unknown; auth?: string };

/** A fake api.github.com that records every call. */
function fakeGitHub(overrides: Record<string, (call: Call) => Response | undefined> = {}) {
  const calls: Call[] = [];
  let refUpdates = 0;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: (init?.headers as Record<string, string>)?.Authorization,
    };
    calls.push(call);
    for (const [pattern, handler] of Object.entries(overrides)) {
      if (url.includes(pattern)) {
        const response = handler(call);
        if (response) return response;
      }
    }
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    if (url.endsWith("/user")) return json({ login: "nfbrentano" });
    if (url.endsWith("/git/blobs")) return json({ sha: `blob-${calls.length}` }, 201);
    if (url.includes("/git/ref/heads/main")) return json({ object: { sha: "parent-sha" } });
    if (url.includes("/git/commits/parent-sha")) return json({ tree: { sha: "base-tree" } });
    if (url.endsWith("/git/trees")) return json({ sha: "new-tree" }, 201);
    if (url.endsWith("/git/commits"))
      return json({ sha: "new-commit", html_url: "https://github.com/x/commit/new-commit" }, 201);
    if (url.includes("/git/refs/heads/main")) {
      refUpdates++;
      return json({});
    }
    return json({ message: "Not Found" }, 404);
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls, refUpdates: () => refUpdates };
}

describe("GitHub connection (RF08, CA06, CA07)", () => {
  afterEach(() => localStorage.clear());

  it("verifies the login and the write permission", async () => {
    const { fetcher, calls } = fakeGitHub();
    expect(await verifyToken("tok", fetcher)).toBe("nfbrentano");
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.github.com/user",
      "https://api.github.com/repos/nfbrentano/FunEnglish/git/blobs",
    ]);
    // The token only ever goes to api.github.com, as a bearer header.
    expect(
      calls.every((c) => c.url.startsWith("https://api.github.com/") && c.auth === "Bearer tok"),
    ).toBe(true);
  });

  it("explains a token that can't write to the repository", async () => {
    const { fetcher } = fakeGitHub({
      "/git/blobs": () =>
        new Response(JSON.stringify({ message: "Resource not accessible" }), { status: 403 }),
    });
    await expect(verifyToken("tok", fetcher)).rejects.toThrow(
      "This token can't write to nfbrentano/FunEnglish",
    );
  });

  it("explains a token GitHub rejects", async () => {
    const { fetcher } = fakeGitHub({
      "/user": () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 }),
    });
    await expect(verifyToken("bad", fetcher)).rejects.toThrow("GitHub doesn't accept this token");
  });

  it("keeps the token in this browser only", () => {
    saveToken("tok");
    expect(readToken()).toBe("tok");
    forgetToken();
    expect(readToken()).toBeNull();
  });
});

describe("commitFiles (RF05, RF06, CA04, CA05)", () => {
  it("puts every file in ONE commit on main", async () => {
    const { fetcher, calls, refUpdates } = fakeGitHub();
    const url = await commitFiles(
      "tok",
      [
        { path: "public/images/activities/a/thumb.webp", base64: "AAA" },
        { path: "public/images/activities/a/one.webp", base64: "BBB" },
      ],
      "content(images): a (via admin panel)",
      fetcher,
    );
    expect(url).toBe("https://github.com/x/commit/new-commit");
    expect(calls.filter((c) => c.url.endsWith("/git/blobs"))).toHaveLength(2);
    const tree = calls.find((c) => c.url.endsWith("/git/trees"))!.body as {
      base_tree: string;
      tree: { path: string }[];
    };
    expect(tree.base_tree).toBe("base-tree");
    expect(tree.tree.map((t) => t.path)).toEqual([
      "public/images/activities/a/thumb.webp",
      "public/images/activities/a/one.webp",
    ]);
    expect(calls.find((c) => c.url.endsWith("/git/commits"))!.body).toMatchObject({
      message: "content(images): a (via admin panel)",
      parents: ["parent-sha"],
    });
    expect(refUpdates()).toBe(1);
  });

  it("rebuilds on the new main once when someone pushed in between", async () => {
    let first = true;
    const { fetcher, calls } = fakeGitHub({
      "/git/refs/heads/main": () => {
        if (!first) return undefined;
        first = false;
        return new Response(JSON.stringify({ message: "Update is not a fast forward" }), {
          status: 422,
        });
      },
    });
    await commitFiles("tok", [{ path: "public/x.webp", base64: "A" }], "m", fetcher);
    expect(calls.filter((c) => c.url.endsWith("/git/commits"))).toHaveLength(2);
  });

  it("maps a src to its path in the repository", () => {
    expect(repoPathFor("/images/activities/a/thumb.webp?v=1a2b3c4d")).toBe(
      "public/images/activities/a/thumb.webp",
    );
  });
});

describe("image processing (RF04, CA04, CA09)", () => {
  it("crops thumbnails to 16:10 and limits item pictures to 960 px and answers to 480 px", () => {
    // 3:2 is taller than 16:10: crop top and bottom.
    expect(planResize(3000, 2000, "thumb")).toEqual({
      sx: 0,
      sy: 63,
      sw: 3000,
      sh: 1875,
      width: 1280,
      height: 800,
    });
    // 2:1 is wider: crop the sides.
    expect(planResize(4000, 2000, "thumb")).toMatchObject({ sx: 400, sy: 0, sw: 3200, sh: 2000 });
    expect(planResize(1000, 2000, "thumb")).toMatchObject({ sx: 0, sy: 688, sw: 1000, sh: 625 });
    expect(planResize(3200, 1600, "content")).toMatchObject({ width: 960, height: 480 });
    expect(planResize(1200, 900, "option")).toMatchObject({ width: 480, height: 360 });
    expect(planResize(800, 600, "content")).toMatchObject({ width: 800, height: 600 });
  });

  it("lowers the quality until the WebP fits in 200 KB", async () => {
    const sizes: number[] = [];
    const blob = await encodeUnderLimit(async (quality) => {
      sizes.push(quality);
      return new Blob([new Uint8Array(quality > 0.6 ? MAX_IMAGE_BYTES + 1 : 1000)], {
        type: "image/webp",
      });
    });
    expect(blob.size).toBe(1000);
    expect(sizes).toEqual([0.82, 0.74, 0.66, 0.58]);
  });

  it("uses the kind's own limit", async () => {
    await expect(
      encodeUnderLimit(
        async () => new Blob([new Uint8Array(50 * 1024)], { type: "image/webp" }),
        40 * 1024,
      ),
    ).rejects.toThrow("40 KB");
  });

  it("refuses images that never fit, and browsers without WebP", async () => {
    await expect(
      encodeUnderLimit(
        async () => new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: "image/webp" }),
      ),
    ).rejects.toBeInstanceOf(ImageTooLargeError);
    await expect(
      encodeUnderLimit(async () => new Blob([new Uint8Array(10)], { type: "image/png" })),
    ).rejects.toBeInstanceOf(WebpUnsupportedError);
  });

  it("knows thumbnails and the bulk-upload file names", () => {
    expect(kindForSrc("/images/activities/a/thumb.webp")).toBe("thumb");
    expect(kindForSrc("/images/activities/a/kettle.webp")).toBe("content");
    expect(kindForSrc("/images/activities/a/question-2-option-3.webp?v=ab12cd34")).toBe("option");
    expect(kindForSrc("/images/categories/grammar.webp")).toBe("thumb");
    expect(srcForFileName("travel-vocabulary--luggage.PNG")).toBe(
      "/images/activities/travel-vocabulary/luggage.webp",
    );
    expect(srcForFileName("luggage.png")).toBeNull();
  });
});
