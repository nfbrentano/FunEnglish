// Immutable list edits for the structured editors (spec: gestão completa, RF01–RF03).

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const removeItem = <T>(items: readonly T[], index: number): T[] =>
  items.filter((_, i) => i !== index);

export const insertItem = <T>(items: readonly T[], index: number, item: T): T[] => [
  ...items.slice(0, index),
  item,
  ...items.slice(index),
];

export const replaceItem = <T>(items: readonly T[], index: number, item: T): T[] =>
  items.map((current, i) => (i === index ? item : current));

/** Deep copy for "Duplicate" (plain JSON content). */
export const cloneItem = <T>(item: T): T => JSON.parse(JSON.stringify(item)) as T;
