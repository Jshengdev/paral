import { existsSync } from "node:fs";
import type { Box, Expect, Truth } from "../shape.ts";
import type { Placed } from "../session.ts";
import { first, of, spoken, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C17: a rendered lesson. It may arrive late, but it must arrive, and it must be a real file.
export function lesson(ask: Ask, expect: Expect): Verdict[] {
  if (!expect.clip) return [];
  const s = ask.index;
  const clip = first(ask.moments, "clip");
  if (!clip) return [no("C17", s, "A rendered lesson plays for a hard idea", "no clip was sent")];
  const firstWords = first(ask.moments, "say");
  return [
    existsSync(clip.path) ? yes("C17", s, "A rendered lesson plays for a hard idea", `${clip.seconds} s clip`) : no("C17", s, "A rendered lesson plays for a hard idea", "the clip's file is missing"),
    yes("C17", s, "The words did not wait for the lesson", firstWords ? `first words ${Math.round(clip.at - firstWords.at)} ms before the clip` : "no words"),
  ];
}

// The video: each board opens after the opener and builds while the answer is said (13:02, 20:50, 22:24, 23:49).
// The video is cut, so its times show the order, not the speed. The order is the bar: the board is open by the end
// of the first sentence after the opener, never after the answer.

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// A board is a drawing: at least two boxes, so that something joins something. One pass sent every board cut down
// to its first box, and the old check, "it is not empty", passed it. The last board line is the one he is left with.
const BOXES = 2;

function drawing(ask: Ask, last: { text: string }): Verdict {
  const boxes = last.text.split(/ → | \| /).filter((cell) => cell.trim() !== "").length;
  const measured = `${boxes} ${boxes === 1 ? "box" : "boxes"}: ${last.text.slice(0, 80)}`;
  return boxes >= BOXES ? yes("C8", ask.index, "The board is a drawing of two boxes or more", measured) : no("C8", ask.index, "The board is a drawing of two boxes or more", measured);
}

// The painter draws the arrow between two boxes. A box whose own words start or end with an arrow sign shows two
// in a row. Seen once in fifteen boards over three passes ("→ most of length").
function plainBoxes(ask: Ask, last: { text: string }): Verdict {
  const cells = last.text.split(/ \| /).flatMap((row) => row.split(" → ")).map((cell) => cell.trim());
  const marked = cells.filter((cell) => /^(→|->|=>)|(→|->|=>)$/.test(cell));
  return marked.length === 0 ? yes("C8", ask.index, "No box carries an arrow sign of its own", `${cells.length} boxes, none does`)
    : no("C8", ask.index, "No box carries an arrow sign of its own", `"${marked[0].slice(0, 60)}"`);
}

// His click of 2026-11-14 at 16:52, with DuckyHelper's own notes in front of him ("the board never opens empty",
// version 0.10.41): a board opens on its first row. A board line with no rows is an empty card, and none may be sent.
function neverEmpty(ask: Ask): Verdict[] {
  const boards = of(ask.moments, "board");
  if (boards.length === 0) return [];
  const empty = boards.filter((m) => m.text.trim() === "").length;
  const what = "The board never opens empty";
  return [empty === 0 ? yes("C8", ask.index, what, `${boards.length} board lines, each with rows`) : no("C8", ask.index, what, "a card opened with nothing on it")];
}

export function board(ask: Ask, expect: Expect, truth: Truth[], placed: Placed[]): Verdict[] {
  const s = ask.index;
  const drawn = of(ask.moments, "board").filter((m) => m.text.trim() !== "");
  const opened = drawn[0];
  const last = drawn.at(-1);   // the board he is left with
  const never = neverEmpty(ask);
  if (expect.board === undefined) return last ? [...never, drawing(ask, last), plainBoxes(ask, last)] : never;
  if (!expect.board) return [...never, opened ? no("C8", s, "No board opens here", "one opened") : yes("C8", s, "No board opens here", "none")];
  if (!opened || !last) return [...never, no("C8", s, "A board opens", "none opened")];
  const firstWords = first(ask.moments, "say");
  const openers = new Set(of(ask.moments, "say").filter((m) => m.opener).map((m) => m.id));
  const answer = spoken(ask).find((sentence) => !openers.has(sentence.of));
  const early = "The board opens while the answer begins, not after it";
  const measured = `${firstWords ? Math.round(opened.at - firstWords.at) : "?"} ms after its first words${answer ? `, ${Math.round(answer.end - opened.at)} ms before the answer's first sentence ends` : ""}`;
  const limit = "by the end of the first sentence after the opener (the video's order; his click of 11-14 at 16:52)";
  const out = [
    ...never,
    !answer ? unseen("C8", s, early, "nothing was voiced after the opener") : opened.at <= answer.end ? yes("C8", s, early, measured, limit) : no("C8", s, early, measured, limit),
    drawing(ask, last),
    plainBoxes(ask, last),
  ];
  const where = placed.filter((p) => p.what === "board" && p.at >= opened.at).at(-1);
  if (!where) return [...out, unseen("C8", s, "The board covers no text", "the film did not say where it put the board")];
  const covered = truth.filter((t) => t.box.h < 90 && overlap(where.box, t.box) > 0);
  return [...out, covered.length === 0 ? yes("C8", s, "The board covers no text", "it sits in an empty part of the page") : no("C8", s, "The board covers no text", `it covers "${covered[0].text.slice(0, 40)}"`)];
}

// The board's card is shrunk to fit the room it is given, and its words shrink with it. The Mac's own text styles
// stop at 10 points (Apple's Human Interface Guidelines, the smallest built-in styles), so a board whose words come
// out smaller than that cannot be read. The size is worked out from the card the painter drew: a card of N rows is
// two pads, N boxes of one line of type with its padding, and the gaps between rows; what it was shrunk by is its
// drawn height over that. Seen on film, 2026-11-14: a one-row board of three long steps drawn 17.5 points tall.
const SMALLEST_TYPE = 10;
const LINE = 1.2;   // a line of the system font is this many times its size (a two-row card measured 115.5 points at a shrink of 0.903)

export type BoardLook = { pad: number; boxPadY: number; rowGap: number; type: number };

export function readable(criterion: string, s: number, rows: number, card: Box | null, look: BoardLook): Verdict[] {
  const what = "The board's words are big enough to read";
  if (card === null || rows === 0) return [];
  const whole = 2 * look.pad + rows * (LINE * look.type + 2 * look.boxPadY) + (rows - 1) * look.rowGap;
  const size = look.type * Math.min(1, card.h / whole);
  const limit = `${SMALLEST_TYPE} points (the smallest text style the Mac itself uses)`;
  const measured = `about ${size.toFixed(1)} points: a card of ${rows} row${rows === 1 ? "" : "s"} drawn ${card.h} points tall`;
  return [size >= SMALLEST_TYPE ? yes(criterion, s, what, measured, limit) : no(criterion, s, what, measured, limit)];
}
