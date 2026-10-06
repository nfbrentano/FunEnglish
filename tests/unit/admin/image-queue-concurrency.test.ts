import { describe, expect, it, vi } from "vitest";
import {
  BLOB_CONCURRENCY,
  commitFiles,
  GitHubError,
  mapConcurrent,
  type RepoFile,
} from "@/lib/admin/github";

type Call = { url: string; method: string; body?: unknown };

describe("image queue concurrency & retry (spec: fila de imagens no painel, RNF04, RF07, CA05, CT05, CT12)", () => {
  it("enforces BLOB_CONCURRENCY limit of 4 concurrent worker executions (RNF04, CT12)", async () => {
    expect(BLOB_CONCURRENCY).toBe(4);

    let activeWorkers = 0;
    let maxObservedWorkers = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);

    await mapConcurrent(items, BLOB_CONCURRENCY, async () => {
      activeWorkers++;
      maxObservedWorkers = Math.max(maxObservedWorkers, activeWorkers);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeWorkers--;
    });

    expect(maxObservedWorkers).toBeLessThanOrEqual(4);
    expect(maxObservedWorkers).toBeGreaterThan(1);
  });

  it("retries on 403 or 429 secondary rate limit and succeeds (RNF04, CT12)", async () => {
    let rateLimitCalls = 0;
    const calls: Call[] = [];

    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const call: Call = {
        url,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
      calls.push(call);

      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });

      if (url.endsWith("/git/blobs")) {
        rateLimitCalls++;
        // Fail first call with 429
        if (rateLimitCalls === 1) {
          return json({ message: "You have exceeded a secondary rate limit" }, 429);
        }
        return json({ sha: "blob-sha" }, 201);
      }
      if (url.includes("/git/ref/heads/main")) return json({ object: { sha: "parent-sha" } });
      if (url.includes("/git/commits/parent-sha")) return json({ tree: { sha: "base-tree" } });
      if (url.endsWith("/git/trees")) return json({ sha: "new-tree" }, 201);
      if (url.endsWith("/git/commits"))
        return json({ sha: "new-commit", html_url: "https://github.com/commit/123" }, 201);
      if (url.includes("/git/refs/heads/main")) return json({});

      return json({ message: "Not Found" }, 404);
    });

    const files: RepoFile[] = [{ path: "public/test.webp", base64: "AAAA" }];
    const progressUpdates: number[] = [];

    const url = await commitFiles(
      "token",
      files,
      "test message",
      fetcher as unknown as typeof fetch,
      (current) => progressUpdates.push(current),
    );

    expect(url).toBe("https://github.com/commit/123");
    expect(rateLimitCalls).toBe(2); // 1st failed with 429, 2nd succeeded
    expect(progressUpdates).toEqual([1]);
  });

  it("does not update main ref if any blob upload fails completely (RF07, CA05, CT05)", async () => {
    let refUpdated = false;

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });

      if (url.endsWith("/git/blobs")) {
        // Blob upload fails with non-retryable 500 error
        return json({ message: "Server error" }, 500);
      }
      if (url.includes("/git/refs/heads/main")) {
        refUpdated = true;
        return json({});
      }

      return json({});
    });

    const files: RepoFile[] = [
      { path: "public/file1.webp", base64: "A" },
      { path: "public/file2.webp", base64: "B" },
    ];

    await expect(
      commitFiles("token", files, "msg", fetcher as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(GitHubError);

    // Main ref was never updated (no partial commit on main)
    expect(refUpdated).toBe(false);
  });
});
