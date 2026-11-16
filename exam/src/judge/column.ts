import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C25: a chain of steps is drawn as one column. His click of 2026-11-15, 18:47, from the reference's video:
//   20:14  "Explain the request pipeline." It goes down a numbered list of six steps on his page.
//   20:43  his follow-up: "Draw a quick diagram."
//   20:51.2 to 20:51.4 (cut at five frames a second)  the card slides in with seven boxes already on it, one under
//          another and joined downward: the request coming in, then a box for each step, in the page's order.
// Seen once. The bar is held where the video shows it: a drawing asked for right after an answer about a list of
// steps on his page. A drawing of how things connect keeps its rows of boxes joined across (13:06, 13:24, 23:51).
//
// Which way the boxes are joined is the painter's to say, so it is read from the film's record of the board
// (`shape`), not from the line that crosses.

const boxesOf = (text: string) => text.split(" | ").map((row) => row.split(" → ").map((box) => box.trim()).filter((box) => box !== ""));
const names = (box: string, step: string) => step.split("|").some((way) => box.toLowerCase().includes(way.trim().toLowerCase()));

export function column(ask: Ask, expect: Expect, placed: Placed[], until: number): Verdict[] {
  if (expect.column === undefined) return [];
  const s = ask.index;
  const drawn = of(ask.moments, "board").filter((m) => m.text.trim() !== "");
  const last = drawn.at(-1);
  if (expect.column === false) {
    const what = "A drawing of how things connect keeps its rows of boxes joined across";
    if (!last) return [];
    const widest = Math.max(...boxesOf(last.text).map((row) => row.length));
    return [widest >= 2 ? yes("C25", s, what, `its widest row has ${widest} boxes`) : no("C25", s, what, `every row is one box: ${last.text.slice(0, 80)}`)];
  }
  const one = "Asked to draw the steps, the board is one column: a box to a row";
  if (!last) return [no("C25", s, one, "no board was drawn")];
  const rows = boxesOf(last.text);
  const boxes = rows.flat();
  const measured = `${rows.length} rows, ${boxes.length} boxes: ${last.text.slice(0, 90)}`;
  const film = placed.filter((p) => p.what === "board" && p.at >= ask.down && p.at < until).at(-1);
  const joined = "The boxes are joined downward";
  const steps = expect.column;
  const found = steps.map((step) => boxes.findIndex((box) => names(box, step)));
  const missing = steps.filter((_, at) => found[at] < 0);
  const inOrder = found.every((at, i) => i === 0 || at > found[i - 1]);
  const each = "There is a box for each step of the page's list, in the page's order";
  const whole = "The column comes whole, with the sentence that brings it";
  return [
    rows.length >= 2 && rows.every((row) => row.length === 1) ? yes("C25", s, one, measured) : no("C25", s, one, measured),
    !film ? unseen("C25", s, joined, "the film did not say how it drew the board") : film.shape === "column" ? yes("C25", s, joined, "the film's record names a column") : no("C25", s, joined, `the film's record names ${film.shape ? `"${film.shape}"` : "no shape"}`),
    missing.length > 0 ? no("C25", s, each, `no box for "${missing[0]}" among: ${boxes.join(", ").slice(0, 110)}`)
      : !inOrder ? no("C25", s, each, `out of the page's order: ${boxes.join(", ").slice(0, 110)}`)
      : boxes.length > steps.length + 1 ? no("C25", s, each, `${boxes.length} boxes for ${steps.length} steps`)
      : yes("C25", s, each, `${boxes.length} boxes for ${steps.length} steps`),
    boxesOf(drawn[0].text).flat().length === boxes.length ? yes("C25", s, whole, `${boxes.length} boxes on the card as it opened`) : no("C25", s, whole, `it opened with ${boxesOf(drawn[0].text).flat().length} of its ${boxes.length} boxes`),
  ];
}
