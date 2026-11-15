import type { Expect } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import { plain } from "./text.ts";

// A sum said aloud with what it comes to, as "9 plus 4, which is 13" or "8 plus 3. So k is 11". On film on 11-14 a
// worked example said "k equals 8 plus 3. So k is 12": eleven was his own answer, which it may not say.
const SUM = /\b(\d+) (plus|minus) (\d+)\b(?:,? which is| really is| is|\. So \w+ is|\. So \w+ equals|, so \w+ is|, so \w+ equals|, and \w+ is|, giving \w+ equals) (\d+)\b/g;

/** The hint ladder's own rules about what a hint may hold: never his result, no wrong sum, no total on the last rung. */
export function ladder(ask: Ask, expect: Expect): Verdict[] {
  return [...sumsRight(ask), ...topRungStops(ask), ...neverTheResult(ask, expect)];
}

function sumsRight(ask: Ask): Verdict[] {
  const text = of(ask.moments, "say").filter((m) => !m.opener).map((m) => m.text).join(" ");
  const sums = [...text.matchAll(SUM)].map((m) => ({ said: m[0], is: m[2] === "plus" ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]), given: Number(m[4]) }));
  if (sums.length === 0) return [];
  const wrong = sums.filter((sum) => sum.is !== sum.given);
  const what = "A sum it says aloud comes out right";
  return [wrong.length === 0 ? yes("C16", ask.index, what, `${sums.length} sums, each right`) : no("C16", ask.index, what, `it said "${wrong[0].said}", and that is ${wrong[0].is}`)];
}

// The last rung works a step on other numbers and stops at the line that shows the move. It leaves the total to him:
// a total said there has twice been a wrong one, said to keep from saying his own answer.
function topRungStops(ask: Ask): Verdict[] {
  const top = of(ask.moments, "say").filter((m) => m.top);
  if (top.length === 0) return [];
  const totals = [...top.map((m) => m.text).join(" ").matchAll(SUM)];
  const what = "On the last rung the example stops before its total";
  return [totals.length === 0 ? yes("C16", ask.index, what, `${top.length} lines, no total said`) : no("C16", ask.index, what, `it said "${totals[0][0]}"`)];
}

// The scenario lists the ways his result could be said. None may be in a line, a mark's label or a board.
function neverTheResult(ask: Ask, expect: Expect): Verdict[] {
  if (!expect.never) return [];
  const everything = [...of(ask.moments, "say").map((m) => m.text), ...of(ask.moments, "mark").map((m) => m.label ?? ""), ...of(ask.moments, "board").map((m) => m.text)].join(" ");
  const leaked = expect.never.filter((phrase) => plain(everything).includes(plain(phrase)));
  return [leaked.length === 0 ? yes("C16", ask.index, "It never gives the result", "no line holds it") : no("C16", ask.index, "It never gives the result", `it said: ${leaked.join(", ")}`)];
}
