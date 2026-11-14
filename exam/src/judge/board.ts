import { existsSync } from "node:fs";
import type { Box, Expect, Truth } from "../shape.ts";
import type { Placed } from "../session.ts";
import { first, of, spoken, type Ask } from "../timeline.ts";
import { no, unseen, within, yes, type Verdict } from "../verdict.ts";

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

export function board(ask: Ask, expect: Expect, truth: Truth[], placed: Placed[]): Verdict[] {
  const s = ask.index;
  const opened = first(ask.moments, "board");
  // A card may open empty when he asks for a drawing. It must then be filled or taken away: an empty card is never left.
  const lastBoard = of(ask.moments, "board").at(-1);
  const closed = of(ask.moments, "board-closed").some((m) => lastBoard !== undefined && m.at >= lastBoard.at);
  const leftEmpty = lastBoard !== undefined && lastBoard.text.trim() === "" && !closed;
  if (leftEmpty) return [no("C8", s, "An empty card is filled or taken away", "the card opened and stayed empty")];
  if (lastBoard !== undefined && lastBoard.text.trim() === "") return expect.board ? [no("C8", s, "A board opens", "a card opened and was taken away with no drawing")] : [yes("C8", s, "An empty card is filled or taken away", "it opened empty and was taken away")];
  if (expect.board === undefined) return lastBoard ? [drawing(ask, lastBoard), plainBoxes(ask, lastBoard)] : [];
  if (!expect.board) return [opened ? no("C8", s, "No board opens here", "one opened") : yes("C8", s, "No board opens here", "none")];
  if (!opened || !lastBoard) return [no("C8", s, "A board opens", "none opened")];
  const firstWords = first(ask.moments, "say");
  const openers = new Set(of(ask.moments, "say").filter((m) => m.opener).map((m) => m.id));
  const answer = spoken(ask).find((sentence) => !openers.has(sentence.of));
  const early = "The board opens while the answer begins, not after it";
  const measured = `${firstWords ? Math.round(opened.at - firstWords.at) : "?"} ms after its first words${answer ? `, ${Math.round(answer.end - opened.at)} ms before the answer's first sentence ends` : ""}`;
  const out = [
    !answer ? unseen("C8", s, early, "nothing was voiced after the opener") : opened.at <= answer.end ? yes("C8", s, early, measured, "by the end of the first sentence after the opener (the video's order)") : no("C8", s, early, measured, "by the end of the first sentence after the opener (the video's order)"),
    drawing(ask, lastBoard),
    plainBoxes(ask, lastBoard),
    // His choice of 2026-11-14: the board opens within two seconds of the first words. The board's
    // card may open empty and fill; its opening is the first board line of the ask.
    within("C8", s, "The board opens within two seconds of the first words", firstWords ? opened.at - firstWords.at : null, 2000, "his click of 11-14, from the 04:30 page"),
  ];
  const where = placed.filter((p) => p.what === "board" && p.at >= opened.at).at(-1);
  if (!where) return [...out, unseen("C8", s, "The board covers no text", "the film did not say where it put the board")];
  const covered = truth.filter((t) => t.box.h < 90 && overlap(where.box, t.box) > 0);
  return [...out, covered.length === 0 ? yes("C8", s, "The board covers no text", "it sits in an empty part of the page") : no("C8", s, "The board covers no text", `it covers "${covered[0].text.slice(0, 40)}"`)];
}
