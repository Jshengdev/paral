import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import { of, spoken, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C27: a board of words alone. His click of 2026-11-15, 18:47, from the reference's video:
//   22:05  his follow-up: which domain would it buy?
//   22:25  the card opens; 22:26 it holds "lnk.lt/4CQMZu" as the first sentence names that choice;
//   22:28  "linklet.link/4CQMZu" is added under it as the second sentence names that one.
// No boxes and no arrows: each line is a whole example of the thing he asked to see, written large. Seen once.
//
// How the card was drawn (words, not boxes), at what size, and when each line came up are the film's to say:
// `shape`, `type` and `rows` on its record of the board.

// The video's written lines stand about three times as tall as the words in its boxes (25 px beside 9 px in the
// video's frame, at 22:28 and 24:07). Twice is the bar: the largest at which a line of thirty letters still fits
// the build's card (560 wide, 20 of padding each side, about half an em a letter).
const LARGE = 2;
// The video shows two lines. Three is the most that still reads at a glance as a short list of examples.
const MOST = 3;

const linesOf = (text: string) => text.split(" | ").map((row) => row.trim()).filter((row) => row !== "");

/** `boxType` is the size, in points, the build draws a box's words at. `until` is where this ask's stretch of the film ends. */
export function writtenBoard(ask: Ask, expect: Expect, placed: Placed[], until: number, boxType: number): Verdict[] {
  if (expect.written === undefined) return [];
  const s = ask.index;
  const alone = "Asked to be shown what it would look like, the board is words alone: no boxes, no arrows";
  const last = of(ask.moments, "board").filter((m) => m.text.trim() !== "").at(-1);
  if (!last) return [no("C27", s, alone, "no board was drawn")];
  const lines = linesOf(last.text);
  const film = placed.filter((p) => p.what === "board" && p.at >= ask.down && p.at < until);
  const drawnAs = film.at(-1);
  const joined = lines.find((line) => line.includes(" → "));
  const example = new RegExp(expect.written, "i");
  const not = lines.find((line) => !example.test(line));
  const each = "Each line is a whole example of the thing he asked to see";
  const large = "The words are written large";
  return [
    joined ? no("C27", s, alone, `a row of boxes: ${joined.slice(0, 80)}`)
      : !drawnAs ? unseen("C27", s, alone, "the film did not say how it drew the board")
      : drawnAs.shape === "words" ? yes("C27", s, alone, `${lines.length} ${lines.length === 1 ? "line" : "lines"}: ${last.text.slice(0, 80)}`)
      : no("C27", s, alone, `the film's record names ${drawnAs.shape ? `"${drawnAs.shape}"` : "no shape"}: it drew boxes`),
    not ? no("C27", s, each, `"${not.slice(0, 60)}" is not one`) : lines.length > MOST ? no("C27", s, each, `${lines.length} lines`) : yes("C27", s, each, lines.join(", ").slice(0, 110)),
    drawnAs?.type === undefined ? unseen("C27", s, large, "the film did not say what size it drew the words at")
      : drawnAs.type >= LARGE * boxType ? yes("C27", s, large, `${drawnAs.type} points, beside ${boxType} in a box`) : no("C27", s, large, `${drawnAs.type} points, beside ${boxType} in a box`),
    paced(ask, lines.length, film.filter((p) => p.rows !== undefined)),
  ];
}

// A line comes with the sentence that names it. Which sentence that is cannot be read from the words (it says
// "q h dot link" and writes "qh.link"), so the order is held: no two lines come together, the second is not up
// before the second sentence begins, and none comes after the answer has ended.
function paced(ask: Ask, lines: number, drawn: Placed[]): Verdict {
  const s = ask.index;
  const what = "Each line is added as the answer comes to it";
  if (lines === 1) return yes("C27", s, what, "one line, on the card as it opened");
  if (drawn.length === 0) return no("C27", s, what, "the film's record names no line as it was drawn: the card came whole");
  const openers = new Set(of(ask.moments, "say").filter((m) => m.opener).map((m) => m.id));
  const said = spoken(ask).filter((sentence) => !openers.has(sentence.of));
  if (said.length === 0) return unseen("C27", s, what, "nothing was voiced, so no sentence has a time");
  const cameUp = (line: number) => drawn.find((p) => (p.rows ?? 0) >= line)?.at;
  for (let line = 1; line <= lines; line++) {
    const at = cameUp(line);
    if (at === undefined) return no("C27", s, what, `line ${line} was never drawn`);
    if (line > 1 && at <= (cameUp(line - 1) ?? -Infinity)) return no("C27", s, what, `lines ${line - 1} and ${line} came together`);
    if (at > said.at(-1)!.end) return no("C27", s, what, `line ${line} came after the answer had ended`);
  }
  const second = said[1];
  if (second && cameUp(2)! < second.start) return no("C27", s, what, "the second line was up before the second sentence began");
  return yes("C27", s, what, `${lines} lines, one at a time`);
}
