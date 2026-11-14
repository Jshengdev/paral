export type EarEvent =
  | { type: "key.down"; at: number }
  | { type: "ear"; text: string }
  | { type: "key.up"; at: number };

export type Words = { text: string; final: boolean; startedAt: number | null; endedAt: number | null };

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();

/** Whether a line drafted from his words so far still fits his final words: the same words, or a start that covers enough of them. */
export function fits(drafted: string, final: string, share: number): boolean {
  const had = plain(drafted);
  const all = plain(final);
  if (had === all) return true;
  return all.startsWith(had + " ") && had.split(" ").length >= share * all.split(" ").length;
}

export const silence: Words = { text: "", final: false, startedAt: null, endedAt: null };

export function hear(words: Words, event: EarEvent): Words {
  switch (event.type) {
    case "key.down":
      return { text: "", final: false, startedAt: event.at, endedAt: null };
    case "ear":
      return words.startedAt === null || words.final ? words : { ...words, text: event.text.trim() };
    case "key.up":
      return words.startedAt === null ? words : { ...words, final: true, endedAt: event.at };
  }
}

/**
 * Whether his words ask for a drawing. A phrase counts where it starts a word ("draw" in "drawing", not in
 * "withdraw"), and "…" inside a phrase stands for whatever words come between.
 */
export function asksForDrawing(words: string, phrases: string[]): boolean {
  const said = words.toLowerCase();
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return phrases.some((phrase) => new RegExp("\\b" + phrase.toLowerCase().split("…").map((part) => escape(part.trim())).join(".+")).test(said));
}
