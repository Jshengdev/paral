export type EarEvent =
  | { type: "key.down"; at: number }
  | { type: "ear"; text: string }
  | { type: "key.up"; at: number };

export type Words = { text: string; final: boolean; startedAt: number | null; endedAt: number | null };

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();

/** How much of his question a draft must have heard: this share of its words and at least this many, or all of it but small words. */
export type Enough = { share: number; least: number; small: string[] };

/**
 * Whether a line drafted from his words so far still fits his final words. It does when the words are the same;
 * when the draft is a start of them and every word he added after it is a small one ("get before them"); or when
 * it is a start that heard enough: a share of the words and a least number of them. A short start is never
 * enough, since the thing he asks about may be in the words it did not hear.
 */
export function fits(drafted: string, final: string, enough: Enough): boolean {
  const had = plain(drafted);
  const all = plain(final);
  if (had === all) return true;
  if (!all.startsWith(had + " ")) return false;
  const heard = had.split(" ").length;
  if (heard >= enough.least && heard >= enough.share * all.split(" ").length) return true;
  return all.slice(had.length + 1).split(" ").every((word) => enough.small.includes(word));
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
