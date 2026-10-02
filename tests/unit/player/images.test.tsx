import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ActivityImage,
  CategoryArt,
  PlayerCategoryContext,
} from "@/components/player/media/activity-image";
import { ActivityMedia } from "@/components/player/media/activity-media";
import { imagesIn } from "@/components/player/media/use-preload";
import QuizPlayer from "@/components/player/plugins/quiz/quiz-player";
import { PlayerResults } from "@/components/player/player-results";
import { resultBand } from "@/lib/site-images";
import { testSettings } from "./settings";

// Which images "exist in this build" (next.config.ts sets this from public/images).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_IMAGES = [
    "/images/categories/grammar.webp",
    "/images/categories/listening.webp",
    "/images/categories/fun.webp",
    "/images/results/practice.webp",
    ...[1, 2, 3, 4].map((n) => `/images/activities/pets/question-1-option-${n}.webp`),
  ].join(",");
});

const fail = (img: HTMLElement) => fireEvent.error(img);

describe("ActivityImage: never shown broken (RF05, CA05)", () => {
  it("is lazy, async and sized while it works", () => {
    render(
      <ActivityImage
        src="/a.webp"
        alt="A kettle"
        width={960}
        height={600}
        fallback={{ kind: "hide" }}
      />,
    );
    const img = screen.getByRole("img", { name: "A kettle" });
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute("width", "960");
  });

  it("falls back to the category art, then to its icon", () => {
    const { container } = render(
      <ActivityImage
        src="/missing.webp"
        alt="x"
        fallback={{ kind: "category", category: "grammar" }}
      />,
    );
    fail(screen.getByRole("img", { name: "x" }));
    const art = screen.getByTestId("category-art");
    expect(art).toHaveAttribute("src", "/images/categories/grammar.webp");
    fail(art);
    // Icon tile on the category tint: decorative, nothing broken.
    expect(screen.getByTestId("category-art").tagName).toBe("DIV");
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the alt text for a picture-only flashcard front, or nothing", () => {
    const { rerender } = render(
      <ActivityImage src="/m.webp" alt="A suitcase" fallback={{ kind: "alt" }} />,
    );
    fail(screen.getByRole("img"));
    expect(screen.getByText("A suitcase").tagName).toBe("P");
    rerender(<ActivityImage src="/n.webp" alt="Hidden" fallback={{ kind: "hide" }} />);
    fail(screen.getByRole("img"));
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("notices images that failed before React was listening (static HTML)", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    render(<ActivityImage src="/gone.webp" alt="Gone" fallback={{ kind: "alt" }} />);
    expect(screen.getByText("Gone").tagName).toBe("P");
    complete.mockRestore();
  });

  it("item media falls back to the activity's category", () => {
    render(
      <PlayerCategoryContext.Provider value="listening">
        <ActivityMedia media={{ kind: "image", src: "/q1.webp", alt: "A radio", source: "ai" }} />
      </PlayerCategoryContext.Provider>,
    );
    fail(screen.getByRole("img", { name: "A radio" }));
    expect(screen.getByTestId("category-art")).toHaveAttribute(
      "src",
      "/images/categories/listening.webp",
    );
  });

  it("doesn't request a planned picture that isn't uploaded yet (no 404s)", () => {
    const { container } = render(
      <ActivityImage
        src="/images/activities/pets/question-9.webp?v=12345678"
        alt="Planned"
        fallback={{ kind: "alt" }}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Planned").tagName).toBe("P");
  });

  it("doesn't even request category art that isn't generated yet (no 404s)", () => {
    const { container } = render(<CategoryArt category="writing" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("category-art").tagName).toBe("DIV");
  });

  it("CategoryArt is decorative", () => {
    render(<CategoryArt category="fun" />);
    expect(screen.getByTestId("category-art")).toHaveAttribute("alt", "");
  });
});

describe("picture answers (RF03, CA03)", () => {
  it("shows a 2×2 grid of pictures named by their text", () => {
    const options = ["cat", "dog", "bird", "fish"].map((text, i) => ({
      text,
      correct: i === 1,
      image: {
        src: `/images/activities/pets/question-1-option-${i + 1}.webp`,
        alt: text,
        source: "ai" as const,
      },
    }));
    const onComplete = vi.fn();
    render(
      <QuizPlayer
        content={{ questions: [{ prompt: "Which one barks?", options }] }}
        settings={testSettings()}
        onProgress={vi.fn()}
        onScore={vi.fn()}
        onComplete={onComplete}
      />,
    );
    const dog = screen.getByRole("button", { name: "dog" });
    // The picture is decorative inside the button; the text is the name (RNF04).
    expect(dog.querySelector("img")).toHaveAttribute("alt", "");
    expect(dog.closest("ul")).toHaveClass("grid-cols-2");
    fireEvent.click(dog);
    expect(screen.getByText("Correct!")).toBeInTheDocument();
  });

  it("keeps the text list when only some options have pictures", () => {
    render(
      <QuizPlayer
        content={{
          questions: [
            {
              prompt: "Pick",
              options: [
                { text: "a", correct: true, image: { src: "/a.webp", alt: "a", source: "ai" } },
                { text: "b", correct: false },
              ],
            },
          ],
        }}
        settings={testSettings()}
        onProgress={vi.fn()}
        onScore={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "a" }).querySelector("img")).toBeNull();
  });
});

describe("results illustration (RF04, CA04)", () => {
  it("picks the band from the score", () => {
    expect(resultBand(9, 10, true)).toBe("great");
    expect(resultBand(6, 10, true)).toBe("good");
    expect(resultBand(3, 10, true)).toBe("practice");
    expect(resultBand(0, 8, false)).toBe("done");
  });

  it("shows the trophy without a request when the band's picture isn't generated", () => {
    const { container } = render(
      <PlayerResults
        result={{ correct: 9, total: 10 }}
        scored
        scores={null}
        teamNames={[]}
        seconds={30}
        studentMode={false}
        onPlayAgain={vi.fn()}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("shows the band's picture, or the trophy if it fails", () => {
    const { container } = render(
      <PlayerResults
        result={{ correct: 3, total: 10 }}
        scored
        scores={null}
        teamNames={[]}
        seconds={30}
        studentMode={false}
        onPlayAgain={vi.fn()}
      />,
    );
    const picture = container.querySelector('img[src="/images/results/practice.webp"]')!;
    expect(picture).toHaveAttribute("alt", "");
    fail(picture as HTMLElement);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("imagesIn (RNF02)", () => {
  it("finds every picture of an item, options included", () => {
    expect(
      imagesIn({
        media: { kind: "image", src: "/q.webp", alt: "q" },
        options: [{ text: "a", image: { src: "/o.webp", alt: "a" } }, { text: "b" }],
      }),
    ).toEqual(["/q.webp", "/o.webp"]);
  });
});
