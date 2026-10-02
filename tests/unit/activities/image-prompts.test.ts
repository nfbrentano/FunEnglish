import { describe, expect, it } from "vitest";
import { applyImagePrompts, promptFromTxt } from "@/lib/activities/image-prompts";
import { validateActivity } from "@/lib/activities/validate";
import { validQuiz } from "./fixtures";

describe("image prompts (spec: imagens pelo painel)", () => {
  it("reads the prompt of the old .txt files", () => {
    expect(
      promptFromTxt(
        "NOME DO ARQUIVO: x--thumb.png\nTamanho: 1280x800\n\nPROMPT (copie tudo abaixo):\nA kettle. Flat style.\n",
      ),
    ).toBe("A kettle. Flat style.");
  });

  it("sets the prompt on matching images only, keeping existing ones unless overwriting (CA02)", () => {
    const activity = {
      thumbnail: { src: "/images/a/thumb.webp", alt: "A", source: "ai" },
      content: {
        cards: [
          { front: { image: { src: "/images/a/b.webp", alt: "B", source: "ai", prompt: "Mine" } } },
        ],
      },
    };
    const prompts = new Map([
      ["/images/a/thumb.webp", "Thumb prompt"],
      ["/images/a/b.webp", "New prompt"],
    ]);
    const { value, filled } = applyImagePrompts(activity, prompts);
    expect(value.thumbnail).toMatchObject({ prompt: "Thumb prompt" });
    expect(value.content.cards[0].front.image.prompt).toBe("Mine");
    expect(filled).toEqual(["/images/a/thumb.webp"]);
    expect(activity.thumbnail).not.toHaveProperty("prompt");
    expect(applyImagePrompts(activity, prompts, { overwrite: true }).filled).toHaveLength(2);
  });

  it("accepts a prompt on any image and limits its length (CA01)", () => {
    const quiz = validQuiz() as { thumbnail: Record<string, unknown> };
    expect(
      validateActivity({ ...quiz, thumbnail: { ...quiz.thumbnail, prompt: "A kettle." } }).ok,
    ).toBe(true);
    expect(
      validateActivity({ ...quiz, thumbnail: { ...quiz.thumbnail, prompt: "x".repeat(2001) } }).ok,
    ).toBe(false);
  });
});
