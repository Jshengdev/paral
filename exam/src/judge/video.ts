import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import { of, spoken, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// Three things the reference does in its video that no bar held until his click of 2026-11-15, 16:26. Each was
// written from the video itself, with the times it is seen:
// C21 (09:10, 16:31, 20:08, 22:34): it says what the page in front of him does not show or prove.
// C22 (24:00 to 24:18): asked for the whole thing, its board grows to six rows, one as each sentence is said.
// C23 (10:00 and 16:42): a follow-up that asks what else or what next is answered in six sentences.
const rowsOf = (text: string) => (text.trim() === "" ? 0 : text.split(" | ").length);
const answerOf = (ask: Ask) => of(ask.moments, "say").filter((m) => !m.opener);

/** C21. The scenario names what the page cannot show it, and words any one of which says so. */
export function cannotKnow(ask: Ask, expect: Expect): Verdict[] {
  if (expect.cannotKnow === undefined) return [];
  const said = answerOf(ask).map((m) => m.text).join(" ");
  const what = `It says what the page cannot show it: ${expect.cannotKnow.what}`;
  const hit = expect.cannotKnow.anyOf.find((words) => said.toLowerCase().includes(words.toLowerCase()));
  return [hit ? yes("C21", ask.index, what, `"${hit}" in: ${said.slice(0, 110)}`) : no("C21", ask.index, what, said.slice(0, 140) || "nothing was said")];
}

/**
 * C22. The board he is left with has four to six rows, one for each sentence, and each row was drawn with its own
 * sentence. When a row was drawn is the film's to say, not the seam's: the board's lines cross early, as each
 * sentence's words are settled, and the scene holds a row until that sentence begins to be voiced. The film's record
 * names the rows drawn at each moment for a board that grows. `until` is where this ask's stretch of the film ends.
 */
export function wholeBoard(ask: Ask, expect: Expect, placed: Placed[], until: number): Verdict[] {
  if (!expect.wholeBoard) return [];
  const s = ask.index;
  const boards = of(ask.moments, "board").filter((m) => m.text.trim() !== "");
  const grows = "Asked for the whole thing, the board grows to four rows or more";
  if (boards.length === 0) return [no("C22", s, grows, "no board was drawn")];
  const rows = rowsOf(boards.at(-1)!.text);
  const sentences = answerOf(ask);
  const each = "The board has a row for each sentence";
  return [
    rows >= 4 && rows <= 6 ? yes("C22", s, grows, `${rows} rows`) : no("C22", s, grows, `${rows} ${rows === 1 ? "row" : "rows"}`),
    rows === sentences.length ? yes("C22", s, each, `${rows} rows, ${sentences.length} sentences`) : no("C22", s, each, `${rows} rows, ${sentences.length} sentences`),
    paced(ask, rows, placed.filter((p) => p.what === "board" && p.rows !== undefined && p.at >= ask.down && p.at < until)),
  ];
}

// A row may lead its own sentence, as a mark does: it may not be up before the sentence before it has begun, and it
// may not come after its own sentence has ended. Two rows never come together.
function paced(ask: Ask, rows: number, drawn: Placed[]): Verdict {
  const s = ask.index;
  const what = "The board grows a row at a time, each row with its sentence";
  if (drawn.length === 0) return no("C22", s, what, "the film's record names no row as it was drawn: the card came whole");
  const voiced = new Map(spoken(ask).map((sentence) => [sentence.of, sentence]));
  if (voiced.size === 0) return unseen("C22", s, what, "nothing was voiced, so no sentence has a time");
  const sentences = answerOf(ask);
  const cameUp = (row: number) => drawn.find((p) => (p.rows ?? 0) >= row)?.at;
  for (let row = 1; row <= rows; row++) {
    const at = cameUp(row);
    if (at === undefined) return no("C22", s, what, `row ${row} was never drawn`);
    if (row > 1 && at <= (cameUp(row - 1) ?? -Infinity)) return no("C22", s, what, `rows ${row - 1} and ${row} came together`);
    const before = row > 1 ? voiced.get(sentences[row - 2]?.id ?? "") : undefined;
    if (before && at < before.start) return no("C22", s, what, `row ${row} was up before sentence ${row - 1} began`);
    const own = voiced.get(sentences[row - 1]?.id ?? "");
    if (own && at > own.end) return no("C22", s, what, `row ${row} came after its sentence had ended`);
  }
  return yes("C22", s, what, `${rows} rows, each drawn with its sentence`);
}

/** C23. A broad follow-up runs to six sentences or more; any other answer the scenario marks stays short. */
export function fullAnswer(ask: Ask, expect: Expect): Verdict[] {
  const s = ask.index;
  const count = answerOf(ask).length;
  const measured = `${count} ${count === 1 ? "sentence" : "sentences"}`;
  const out: Verdict[] = [];
  if (expect.sentencesMost !== undefined) {
    const short = `An ordinary answer stays at ${expect.sentencesMost} sentences or fewer`;
    out.push(count <= expect.sentencesMost ? yes("C23", s, short, measured) : no("C23", s, short, measured));
  }
  if (expect.fullAnswer) {
    const full = "A broad follow-up gets six sentences or more";
    out.push(count >= 6 ? yes("C23", s, full, measured) : no("C23", s, full, measured));
  }
  return out;
}
