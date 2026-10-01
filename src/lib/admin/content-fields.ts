/**
 * Generic "texts" editor support: every string in an activity's content, with its path, so the
 * same form works for every activity type (spec: painel admin, RF13).
 */
export type Path = (string | number)[];
export type TextField = { path: Path; value: string };

/** Technical strings that aren't text for people to read. */
const NON_TEXT_KEYS = new Set(["src", "videoId", "kind", "source", "mode", "url"]);

export function collectTextFields(value: unknown, path: Path = []): TextField[] {
  if (typeof value === "string") return [{ path, value }];
  if (Array.isArray(value))
    return value.flatMap((item, i) => collectTextFields(item, [...path, i]));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      NON_TEXT_KEYS.has(key) ? [] : collectTextFields(child, [...path, key]),
    );
  }
  return [];
}

/** Immutable set: returns a copy with the value at `path` replaced. */
export function setAtPath<T>(root: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const container = (Array.isArray(root) ? [...root] : { ...(root as object) }) as Record<
    string | number,
    unknown
  >;
  container[head] = setAtPath(container[head], rest, value);
  return container as T;
}

/** "questions", 2, "options", 0, "text" → "Question 3 · option 1 · text" */
export function describePath(path: Path): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    const next = path[i + 1];
    if (typeof segment === "string" && typeof next === "number") {
      parts.push(`${singular(segment)} ${next + 1}`);
      i++;
    } else {
      parts.push(String(segment));
    }
  }
  return parts.join(" · ");
}

function singular(word: string): string {
  const name = word.endsWith("ies")
    ? `${word.slice(0, -3)}y`
    : word.endsWith("s")
      ? word.slice(0, -1)
      : word;
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Lowercase-hyphen slug from a title: "Present Perfect Quiz!" → "present-perfect-quiz". */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
