import type { Placed } from "../session.ts";
import type { Box } from "../shape.ts";
import { no, yes, type Verdict } from "../verdict.ts";

// C30: its own pointer comes to each thing it marks. His click of 2026-11-16, 03:46, from the reference's video:
//   11:52, 16:27, 20:22   a pointer of its own travels to each thing as it is marked and rests beside it
// Ours did this before the bar was written. Measured on the 30 films of 2026-11-16, the pointer was at the mark as
// it was drawn on 76 of 76 marks. That is what is held. How it comes (flown in on 58, already close by from the
// mark before on 18) and where it next stands still (a median 22 points off; after some rows it goes to the board to
// write its note) were measured too and are not held: a second mark close by needs no flight, and a note is its to
// write.
//
// The film's record lists the pointer (`what: "pointer"`) at every frame it moves, and each mark (`what: "mark"`,
// named "ask/beat") as it grows.

// Points from the mark's box to the pointer's middle. In the 76 it was never farther than this as its mark was drawn,
// and a pointer left by the capsule is hundreds of points away.
const NEAR = 60;
// The pointer leads the ink by a few frames and follows a long mark to its far end. Every one of the 76 was met
// inside this window around the mark's first frame.
const BEFORE_MS = 500;
const AFTER_MS = 1000;

const gap = (pointer: Box, mark: Box) => {
  const x = pointer.x + pointer.w / 2;
  const y = pointer.y + pointer.h / 2;
  return Math.hypot(Math.max(mark.x - x, 0, x - (mark.x + mark.w)), Math.max(mark.y - y, 0, y - (mark.y + mark.h)));
};

/** One stretch of the film, an ask or a look with no key, from `from` to `until`: every mark first drawn in it. */
export function pointerAtMarks(step: number, from: number, until: number, placed: Placed[]): Verdict[] {
  const what = "Its own pointer is at each mark as the mark is drawn";
  const rows = placed.filter((p) => p.what === "mark" && p.id !== undefined && p.at >= from && p.at < until);
  if (rows.length === 0) return [];
  const pointers = placed.filter((p) => p.what === "pointer");
  const ids = [...new Set(rows.map((p) => p.id))];
  const missed = ids.filter((id) => {
    const mine = rows.filter((p) => p.id === id);
    // A mark grows as it is drawn and the pointer follows its far end: the mark's widest box is the one to be near.
    const box = mine.reduce((widest, p) => (p.box.w * p.box.h > widest.w * widest.h ? p.box : widest), mine[0].box);
    return !pointers.some((p) => p.at >= mine[0].at - BEFORE_MS && p.at <= mine[0].at + AFTER_MS && gap(p.box, box) <= NEAR);
  });
  const limit = `within ${NEAR} points of the mark, from ${BEFORE_MS} ms before it first shows to ${AFTER_MS} ms after`;
  if (missed.length === 0) return [yes("C30", step, what, `${ids.length} of ${ids.length} marks`, limit)];
  return [no("C30", step, what, `no pointer came to ${missed.join(", ")} (${ids.length - missed.length} of ${ids.length} marks)`, limit)];
}
