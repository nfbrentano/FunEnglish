import { describe, expect, it } from "vitest";
import { validateActivity } from "@/lib/activities/validate";
import {
  blankAnswers,
  makeBlank,
  parseBlanks,
  removeBlank,
  setBlankAnswers,
} from "@/lib/admin/blanks";
import { cloneItem, insertItem, moveItem, removeItem } from "@/lib/admin/list-ops";
import { parseYouTubeInput } from "@/lib/admin/youtube-url";
import { validQuiz } from "../activities/fixtures";

describe("parseYouTubeInput (CA05)", () => {
  it.each([
    ["https://www.youtube.com/watch?v=YE7VzlLtp-4&t=30", { videoId: "YE7VzlLtp-4", start: 30 }],
    ["https://youtu.be/YE7VzlLtp-4?t=1m30s", { videoId: "YE7VzlLtp-4", start: 90 }],
    ["youtube.com/shorts/YE7VzlLtp-4", { videoId: "YE7VzlLtp-4" }],
    ["https://www.youtube.com/embed/YE7VzlLtp-4?start=12", { videoId: "YE7VzlLtp-4", start: 12 }],
    ["https://m.youtube.com/watch?v=YE7VzlLtp-4", { videoId: "YE7VzlLtp-4" }],
    ["YE7VzlLtp-4", { videoId: "YE7VzlLtp-4" }],
  ])("%s", (input, expected) => {
    expect(parseYouTubeInput(input)).toEqual(expected);
  });

  it("rejects other sites and broken ids", () => {
    expect(parseYouTubeInput("https://vimeo.com/123")).toBeNull();
    expect(parseYouTubeInput("https://youtube.com/watch?v=short")).toBeNull();
    expect(parseYouTubeInput("not a link")).toBeNull();
  });
});

describe("blanks (CA03)", () => {
  it("turns a selection into a blank, keeping spaces outside", () => {
    const text = "She goes to school every day.";
    expect(makeBlank(text, 4, 9)).toBe("She [[goes]] to school every day.");
    expect(makeBlank(text, 3, 9)).toBe("She [[goes]] to school every day.");
  });

  it("ignores empty selections and selections inside a blank", () => {
    expect(makeBlank("She goes.", 3, 4)).toBe("She goes.");
    expect(makeBlank("She [[goes]] home.", 6, 8)).toBe("She [[goes]] home.");
  });

  it("edits alternatives and removes a blank", () => {
    const text = "She [[goes]] to [[school]].";
    expect(blankAnswers(text)).toEqual([["goes"], ["school"]]);
    const withAlt = setBlankAnswers(text, 0, ["goes", "walks"]);
    expect(withAlt).toBe("She [[goes|walks]] to [[school]].");
    expect(removeBlank(withAlt, 1)).toBe("She [[goes|walks]] to school.");
    expect(parseBlanks("a [[b|c]] d")).toEqual([
      { kind: "text", text: "a " },
      { kind: "blank", answers: ["b", "c"] },
      { kind: "text", text: " d" },
    ]);
  });
});

describe("list ops", () => {
  it("moves, inserts, removes and clones without mutating", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(list, 0, -1)).toEqual(list);
    expect(insertItem(list, 1, "x")).toEqual(["a", "x", "b", "c"]);
    expect(removeItem(list, 1)).toEqual(["a", "c"]);
    expect(list).toEqual(["a", "b", "c"]);
    const item = { options: [{ text: "x" }] };
    const copy = cloneItem(item);
    copy.options[0].text = "y";
    expect(item.options[0].text).toBe("x");
  });
});

describe("validateActivity issues (RF06)", () => {
  it("points each error at its field", () => {
    const quiz = validQuiz() as { content: { questions: { options: { correct?: boolean }[] }[] } };
    for (const option of quiz.content.questions[0].options) delete option.correct;
    const result = validateActivity(quiz);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues).toContainEqual({
        path: ["content", "questions", 0, "options"],
        message: "Each question needs at least one correct option",
      });
  });
});
