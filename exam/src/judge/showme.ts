import type { Expect } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import { aheadInOrder } from "./look.ts";

// What he asked for on 2026-11-14, 20:00: a "show me" that works like autocomplete for the task and leads him along. The build's first version walks what the looks found
// to be ahead, one step each time he says "show me": the board with one row a step and his row named, and one
// sentence, "Step 2 of 3: ...". Where the step is on the page (a box, or the way to it) is held by the mark and way
// checks; that the walk follows him to the next page is held by the looks after it.
const C = "C20";

export function walked(ask: Ask, expect: Expect, ranOn: Date): Verdict[] {
  if (expect.step === undefined) return [];
  const s = ask.index;
  const n = expect.step;
  const board = of(ask.moments, "board").at(-1) ?? null;
  const rows = board === null ? 0 : board.text.split(" | ").length;
  const named = `The board names row ${n} as the step he is on`;
  const out = [board === null ? no(C, s, named, "no board was drawn") : board.now === n - 1 ? yes(C, s, named, `row ${n} of ${rows}`) : no(C, s, named, board.now === undefined ? "the board names no row" : `it names row ${board.now + 1} of ${rows}`)];
  const lines = of(ask.moments, "say").filter((m) => !m.opener);
  const one = `It says one sentence for step ${n} of the ${rows || "steps"} it found`;
  const begins = new RegExp(`^step ${n} of ${rows || "\\d+"}\\b`, "i");
  out.push(lines.length === 1 && begins.test(lines[0].text) ? yes(C, s, one, lines[0].text) : no(C, s, one, lines.length === 0 ? "nothing was said" : lines.map((m) => m.text.slice(0, 60)).join(" / ")));
  // A look draws no board of what is ahead, so the walk's board is where its order and its dates are held.
  if (expect.ahead !== undefined) out.push(...aheadInOrder(C, s, board?.text ?? null, expect.ahead, ranOn));
  return out;
}
