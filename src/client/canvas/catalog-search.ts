/** Lowercase without accents: "cronometro" finds Cronômetro. */
export const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Every word must appear in the name or the description. */
export function searchWidgets<T extends { title: string; description: string }>(
  query: string,
  items: T[],
) {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.filter((w) => {
    const text = plain(`${w.title} ${w.description}`);
    return words.every((word) => text.includes(word));
  });
}
