// Images referenced by activities that aren't in public/images yet (spec: gestão completa, RF16),
// with the file name `npm run images:import` expects and a ready prompt.

export type MissingImage = {
  activityId: string;
  title: string;
  /** /images/activities/<slug>/<name>.webp */
  src: string;
  alt: string;
  /** <slug>--<name>.png: the name to save the generated image with. */
  fileName: string;
  prompt: string;
};

type ImageRef = { src: string; alt: string; prompt?: string };

/** Every { src, alt } object in an activity (thumbnail and content). */
function collectImages(value: unknown, out: ImageRef[] = []): ImageRef[] {
  if (Array.isArray(value)) value.forEach((v) => collectImages(v, out));
  else if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.src === "string" && typeof object.alt === "string")
      out.push({
        src: object.src,
        alt: object.alt,
        prompt: typeof object.prompt === "string" ? object.prompt : undefined,
      });
    for (const child of Object.values(object)) collectImages(child, out);
  }
  return out;
}

/** The style paragraph of content/prompts/image-style.md ("paste at the end of every prompt"). */
export function parseImageStyle(markdown: string): string {
  const quote = /## Style[^\n]*\n\n((?:>.*\n?)+)/.exec(markdown)?.[1] ?? "";
  return quote
    .split("\n")
    .map((line) => line.replace(/^> ?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findMissingImages(
  activities: readonly { id: string; title: string; slug: string }[],
  existing: ReadonlySet<string>,
  style: string,
): MissingImage[] {
  return activities.flatMap((activity) => {
    const seen = new Set<string>();
    return collectImages(activity).flatMap((image) => {
      // External URLs can't be checked; files already there are fine.
      if (!image.src.startsWith("/") || existing.has(image.src) || seen.has(image.src)) return [];
      seen.add(image.src);
      const name = image.src
        .split("/")
        .pop()!
        .replace(/\.[a-z0-9]+$/i, "");
      const subject = image.alt.trim().replace(/\.$/, "") || activity.title;
      return [
        {
          activityId: activity.id,
          title: activity.title,
          src: image.src,
          alt: image.alt,
          fileName: `${activity.slug}--${name}.png`,
          // The prompt saved with the image wins; otherwise build one from the alt (CA08).
          prompt: image.prompt?.trim() || `${subject}. ${style}`,
        },
      ];
    });
  });
}
