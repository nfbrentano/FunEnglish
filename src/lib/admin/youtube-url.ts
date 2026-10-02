/** "1m30s", "90", "90s", "1h2m3s" → seconds. */
function parseTime(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !match[0]) return undefined;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

const ID = /^[\w-]{11}$/;

/**
 * A pasted YouTube link (watch, youtu.be, shorts, embed, with ?t= / &start=) or a bare id →
 * the clip fields (spec: gestão completa, RF04). Null when it isn't a YouTube video.
 */
export function parseYouTubeInput(input: string): { videoId: string; start?: number } | null {
  const text = input.trim();
  if (ID.test(text)) return { videoId: text };
  let url: URL;
  try {
    url = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let videoId: string | null = null;
  if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else {
      const [, kind, id] = url.pathname.split("/");
      if (["shorts", "embed", "live", "v"].includes(kind)) videoId = id;
    }
  }
  if (!videoId || !ID.test(videoId)) return null;
  const start = parseTime(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return start ? { videoId, start } : { videoId };
}
