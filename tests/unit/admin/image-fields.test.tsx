import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageFields, uploadSrcFor } from "@/components/admin/content/image-fields";
import { ImageToolsContext } from "@/components/admin/content/image-paths";

const github = vi.hoisted(() => ({
  token: "tok" as string | null,
  commitFiles: vi.fn(async () => "https://github.com/x/commit/1"),
}));
vi.mock("@/lib/admin/github", async (original) => ({
  ...(await original<typeof import("@/lib/admin/github")>()),
  readToken: () => github.token,
  commitFiles: github.commitFiles,
}));
vi.mock("@/lib/admin/image-processing", async (original) => ({
  ...(await original<typeof import("@/lib/admin/image-processing")>()),
  toWebp: vi.fn(async () => new Blob(["webp"], { type: "image/webp" })),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const STYLE = "Flat vector illustration, no text.";

function Harness({
  initial,
  slug = "weather-forecasts",
}: {
  initial: Record<string, unknown>;
  slug?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ImageToolsContext.Provider
      value={{ slug, style: STYLE, previews: new Map(), setPreview: () => {} }}
    >
      <ImageFields value={value} onChange={setValue} path={["thumbnail"]} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </ImageToolsContext.Provider>
  );
}
const json = () => JSON.parse(screen.getByTestId("json").textContent!);

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  github.token = "tok";
  github.commitFiles.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe("ImageFields (spec: imagens pelo painel)", () => {
  it("writes the prompt from the alt and the house style, and copies it (CA03)", async () => {
    render(
      <Harness initial={{ src: "", alt: "A sun and a cloud with rain on a map", source: "ai" }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Write prompt from alt" }));
    expect(json().prompt).toBe(
      "A sun and a cloud with rain on a map. Flat vector illustration, no text.",
    );

    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await user.click(screen.getByRole("button", { name: "Copy prompt" }));
    expect(writeText).toHaveBeenCalledWith(json().prompt);
  });

  it("uploads to the activity's folder, fills the src and points to the deploy (CA04)", async () => {
    render(<Harness initial={{ src: "", alt: "A suitcase", source: "ai" }} />);
    const file = new File(["png"], "photo.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Choose an image file"), file);

    expect(
      await screen.findByText("Uploaded. It goes live after the next deploy (~3 min)."),
    ).toBeInTheDocument();
    expect(github.commitFiles).toHaveBeenCalledWith(
      "tok",
      [
        {
          path: "public/images/activities/weather-forecasts/thumb.webp",
          base64: expect.any(String),
        },
      ],
      "content(images): weather-forecasts/thumb.webp (via admin panel)",
    );
    expect(json().src).toBe("/images/activities/weather-forecasts/thumb.webp");
    expect(screen.getByRole("link", { name: "See the deploy" })).toHaveAttribute(
      "href",
      expect.stringContaining("/actions/workflows/deploy.yml"),
    );
  });

  it("asks to connect GitHub first (CA10)", async () => {
    github.token = null;
    render(<Harness initial={{ src: "", alt: "A suitcase", source: "ai" }} />);
    await userEvent.upload(
      screen.getByLabelText("Choose an image file"),
      new File(["png"], "a.png", { type: "image/png" }),
    );
    expect(screen.getByText("Connect GitHub to upload images.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect GitHub" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(github.commitFiles).not.toHaveBeenCalled();
  });

  it("needs the slug before uploading", () => {
    render(<Harness slug="" initial={{ src: "", alt: "x", source: "ai" }} />);
    expect(screen.getByRole("button", { name: "Upload image" })).toBeDisabled();
    expect(screen.getByText("Set the slug first: images are saved under it.")).toBeInTheDocument();
  });
});

describe("uploadSrcFor", () => {
  it("keeps this activity's src, else names the file after the alt (or thumb)", () => {
    expect(uploadSrcFor("a", "/images/activities/a/kettle.webp", "x", false)).toBe(
      "/images/activities/a/kettle.webp",
    );
    expect(uploadSrcFor("a", "https://example.com/x.png", "A big red kettle", false)).toBe(
      "/images/activities/a/a-big-red-kettle.webp",
    );
    expect(uploadSrcFor("a", "", "", true)).toBe("/images/activities/a/thumb.webp");
  });
});
