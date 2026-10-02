// Uploading images from the admin panel by committing them to the repository (spec: imagens
// pelo painel, RF05, RF06, RF08). The token stays in this browser only and is sent only to
// api.github.com (RNF01).

export const REPO = "nfbrentano/FunEnglish";
export const BRANCH = "main";
export const ACTIONS_URL = `https://github.com/${REPO}/actions/workflows/deploy.yml`;
export const NEW_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";
const API = "https://api.github.com";
const STORAGE_KEY = "fun-english:github-token";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

// --- Token (per-browser convenience: never stored anywhere else) -----------------------------

export function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    throw new GitHubError("This browser blocks saving the token (private mode?).");
  }
}

export function forgetToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// --- API -------------------------------------------------------------------------------------

type Fetch = typeof fetch;

async function call<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  fetcher: Fetch = fetch,
): Promise<T> {
  const response = await fetcher(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}) as { message?: string });
    throw new GitHubError(
      (detail as { message?: string }).message ?? `GitHub answered ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

/**
 * Checks the token can write to the repository: reads who it belongs to, then creates a tiny
 * unreferenced blob (Contents: write; GitHub discards it). Returns the login (CA06).
 */
export async function verifyToken(token: string, fetcher: Fetch = fetch): Promise<string> {
  let login: string;
  try {
    ({ login } = await call<{ login: string }>(token, "/user", {}, fetcher));
  } catch (error) {
    throw new GitHubError(
      error instanceof GitHubError && error.status === 401
        ? "GitHub doesn't accept this token. Check that you copied all of it."
        : "Couldn't reach GitHub. Check your connection and try again.",
    );
  }
  try {
    await call(
      token,
      `/repos/${REPO}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({ content: "", encoding: "utf-8" }),
      },
      fetcher,
    );
  } catch {
    throw new GitHubError(`This token can't write to ${REPO}. Give it "Contents: Read and write".`);
  }
  return login;
}

export type RepoFile = { path: string; base64: string };

/**
 * Commits files to main in ONE commit (Git Data API: blobs, tree, commit, ref). Retries once if
 * main moved meanwhile. Returns the commit's web URL.
 */
export async function commitFiles(
  token: string,
  files: readonly RepoFile[],
  message: string,
  fetcher: Fetch = fetch,
): Promise<string> {
  if (files.length === 0) throw new GitHubError("Nothing to upload.");
  const blobs = await Promise.all(
    files.map(async (file) => ({
      path: file.path,
      sha: (
        await call<{ sha: string }>(
          token,
          `/repos/${REPO}/git/blobs`,
          {
            method: "POST",
            body: JSON.stringify({ content: file.base64, encoding: "base64" }),
          },
          fetcher,
        )
      ).sha,
    })),
  );

  for (let attempt = 0; ; attempt++) {
    const ref = await call<{ object: { sha: string } }>(
      token,
      `/repos/${REPO}/git/ref/heads/${BRANCH}`,
      {},
      fetcher,
    );
    const parent = ref.object.sha;
    const { tree } = await call<{ tree: { sha: string } }>(
      token,
      `/repos/${REPO}/git/commits/${parent}`,
      {},
      fetcher,
    );
    const newTree = await call<{ sha: string }>(
      token,
      `/repos/${REPO}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: tree.sha,
          tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
        }),
      },
      fetcher,
    );
    const commit = await call<{ sha: string; html_url: string }>(
      token,
      `/repos/${REPO}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
      },
      fetcher,
    );
    try {
      await call(
        token,
        `/repos/${REPO}/git/refs/heads/${BRANCH}`,
        {
          method: "PATCH",
          body: JSON.stringify({ sha: commit.sha, force: false }),
        },
        fetcher,
      );
      return commit.html_url;
    } catch (error) {
      // Someone pushed in between (not a fast-forward): rebuild on the new main once.
      if (attempt === 0 && error instanceof GitHubError && error.status === 422) continue;
      throw error;
    }
  }
}

/** /images/activities/<slug>/<name>.webp → public/images/activities/<slug>/<name>.webp */
export const repoPathFor = (src: string) => `public${src}`;
