import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeClip } from "@/components/player/media/youtube-clip";

type Options = {
  videoId: string;
  host: string;
  playerVars: Record<string, unknown>;
  events: { onError: (e: { data: number }) => void };
};

function mockYouTube() {
  const created: Options[] = [];
  window.YT = {
    Player: class {
      constructor(_id: string, options: Options) {
        created.push(options);
      }
      seekTo = vi.fn();
      playVideo = vi.fn();
      destroy = vi.fn();
    },
  } as never;
  return created;
}

afterEach(() => {
  delete window.YT;
});

describe("YouTubeClip", () => {
  it("plays only the clip, from the privacy-enhanced domain", async () => {
    const created = mockYouTube();
    render(<YouTubeClip videoId="dQw4w9WgXcQ" start={30} end={45} />);

    await vi.waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      host: "https://www.youtube-nocookie.com",
      playerVars: { start: 30, end: 45 },
    });
    expect(screen.getByRole("button", { name: "Replay clip" })).toBeInTheDocument();
  });

  it("links to YouTube when the video can't be embedded", async () => {
    const created = mockYouTube();
    render(<YouTubeClip videoId="dQw4w9WgXcQ" start={30} end={45} />);
    await vi.waitFor(() => expect(created).toHaveLength(1));

    created[0].events.onError({ data: 150 });

    expect(await screen.findByRole("alert")).toHaveTextContent("This clip can't be played here");
    expect(screen.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    );
  });
});
