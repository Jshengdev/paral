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

/** C22. The board he is left with has four to six rows, one for each sentence, and they came a row at a time. */
export function wholeBoard(ask: Ask, expect: Expect): Verdict[] {
  if (!expect.wholeBoard) return [];
  const s = ask.index;
  const boards = of(ask.moments, "board").filter((m) => m.text.trim() !== "");
  const grows = "Asked for the whole thing, the board grows to four rows or more";
  if (boards.length === 0) return [no("C22", s, grows, "no board was drawn")];
  const rows = rowsOf(boards.at(-1)!.text);
  const sentences = answerOf(ask);
  const each = "The board has a row for each sentence";
  const one = "The board grows a row at a time, as each sentence is said";
  // The steps in which it grew: the first board line, and each later one with more rows than the one before it.
  const steps = boards.filter((m, index) => index === 0 || rowsOf(m.text) > rowsOf(boards[index - 1].text));
  // A row may lead its own sentence, as a mark does. It may not be up before the sentence before it has begun.
  const began = new Map(spoken(ask).map((voiced) => [voiced.of, voiced.start]));
  const early = steps.findIndex((m, index) => index >= 1 && sentences[index - 1] !== undefined && m.at < (began.get(sentences[index - 1].id) ?? -Infinity));
  const paced = steps.length < rows ? no("C22", s, one, `${rows} rows came in ${steps.length} ${steps.length === 1 ? "step" : "steps"}`)
    : began.size === 0 ? unseen("C22", s, one, "nothing was voiced, so no sentence has a time")
    : early >= 0 ? no("C22", s, one, `row ${early + 1} was up before sentence ${early} began`) : yes("C22", s, one, `${steps.length} steps for ${rows} rows`);
  return [
    rows >= 4 && rows <= 6 ? yes("C22", s, grows, `${rows} rows`) : no("C22", s, grows, `${rows} ${rows === 1 ? "row" : "rows"}`),
    rows === sentences.length ? yes("C22", s, each, `${rows} rows, ${sentences.length} sentences`) : no("C22", s, each, `${rows} rows, ${sentences.length} sentences`),
    paced,
  ];
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
