// Image prompts live next to each image in the activity JSON (spec: imagens pelo painel, RF01–RF02).

/** The prompt part of a content/prompts/images/<slug>/<name>.txt file (the text after "PROMPT"). */
export function promptFromTxt(text: string): string | null {
  const match = /PROMPT[^\n]*\n([\s\S]+)$/.exec(text);
  const prompt = (match ? match[1] : text).trim();
  return prompt || null;
}

/**
 * Sets `prompt` on every { src, alt } image whose src is in `prompts` and has no prompt yet
 * (or always, with overwrite). Returns the new value and the srcs that were filled.
 */
export function applyImagePrompts<T>(
  value: T,
  prompts: ReadonlyMap<string, string>,
  { overwrite = false }: { overwrite?: boolean } = {},
): { value: T; filled: string[] } {
  const filled: string[] = [];
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const object = Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, walk(v)]),
    );
    if (typeof object.src === "string" && typeof object.alt === "string") {
      const prompt = prompts.get(object.src);
      if (prompt && (overwrite || !object.prompt)) {
        object.prompt = prompt;
        filled.push(object.src);
      }
    }
    return object;
  };
  return { value: walk(value) as T, filled };
}
