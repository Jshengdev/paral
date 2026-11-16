import { notes } from "./judge/notes.ts";
import type { Placed } from "./session.ts";
import type { Ask, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C24, writing on the board with its pointer. Each run here is made up, with one fault planted
// in it, to prove that the check can fail.
const say = (n: number, at: number, text: string): Moment => ({ at, kind: "say", id: `t2:${n}`, text, opener: false, hint: false, top: false });
const voice = (n: number, at: number, ms: number): Moment => ({ at, kind: "voice", of: `t2:${n}`, ms });
// Two sentences, four seconds each, from 5 s: the column, then what happens when a check fails.
const SAID = [say(0, 4000, "The request passes these six checks in order."), voice(0, 5000, 3800), say(1, 4200, "If a check fails, it stops there with an error."), voice(1, 9000, 3800)];
const ASK: Ask = { index: 1, moments: SAID, down: 0, up: 3000 };
const BOARD: Placed = { at: 5000, what: "board", id: "t2", shape: "column", box: { x: 600, y: 300, w: 320, h: 420 } };
const BOXES = [0, 1, 2].map((n): Placed => ({ at: 5000, what: "box", id: `t2/${n}`, box: { x: 630, y: 320 + n * 54, w: 140, h: 36 } }));
const NOTE = "Check fails → error";
/**
 * A note being written: one listing for every three letters, `perLetterMs` apart, from `from` ms, its left edge at `x`,
 * `y`, with the pointer at the end of the writing unless `pointerAt` puts it elsewhere.
 */
function writing(text: string, from: number, perLetterMs: number, x = 790, y = 384, pointerAt?: { x: number; y: number }): Placed[] {
  const out: Placed[] = [];
  for (let n = 3; n <= text.length + 2; n += 3) {
    const says = text.slice(0, Math.min(n, text.length)), at = from + Math.min(n, text.length) * perLetterMs, w = says.length * 6;
    out.push({ at, what: "note", id: "t2/note/0", says, box: { x, y, w, h: 14 } });
    out.push({ at, what: "pointer", box: pointerAt ? { x: pointerAt.x, y: pointerAt.y, w: 40, h: 40 } : { x: x + w - 20, y: y - 13, w: 40, h: 40 } });
  }
  return out;
}
const judged = (drawn: Placed[]) => notes(ASK, { notes: true }, [BOARD, ...BOXES, ...drawn].sort((a, b) => a.at - b.at), Infinity);
const GOOD = writing(NOTE, 9200, 180);

const WRITTEN = "As it talks it writes a note on the board";
const GROWS = "A note is written a few letters at a time, never popped in whole";
const RIDES = "Its pointer rides the writing";
const WHILE = "A note is written while the answer is being said";
const CLEAR = "A note is on the board and over none of its boxes";
const SHORT = "A note is a few words";

export const NOTES_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "a note written beside a box as its sentence is said", check: WRITTEN, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the note comes five to six letters a second", check: GROWS, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the pointer is at the end of the note as it grows", check: RIDES, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the note is written during the second sentence", check: WHILE, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the note is beside the boxes, inside the card", check: CLEAR, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the note is four words", check: SHORT, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "no note at all, as the build draws today", check: WRITTEN, mustPass: false, verdicts: () => judged([]) },
  { name: "the note pops in whole", check: GROWS, mustPass: false, verdicts: () => judged([{ at: 9200, what: "note", id: "t2/note/0", says: NOTE, box: { x: 790, y: 384, w: 114, h: 14 } }, { at: 9200, what: "pointer", box: { x: 884, y: 371, w: 40, h: 40 } }]) },
  { name: "the note is written in a fifth of a second", check: GROWS, mustPass: false, verdicts: () => judged(writing(NOTE, 9200, 10)) },
  { name: "the note is written while the pointer rests on the page", check: RIDES, mustPass: false, verdicts: () => judged(writing(NOTE, 9200, 180, 790, 384, { x: 200, y: 700 })) },
  { name: "the note is written before the answer begins", check: WHILE, mustPass: false, verdicts: () => judged(writing(NOTE, 500, 180)) },
  { name: "the note is still being written after the answer has ended", check: WHILE, mustPass: false, verdicts: () => judged(writing(NOTE, 11000, 180)) },
  { name: "the note is written across a box", check: CLEAR, mustPass: false, verdicts: () => judged(writing(NOTE, 9200, 180, 650, 330)) },
  { name: "the note runs off the card", check: CLEAR, mustPass: false, verdicts: () => judged(writing(NOTE, 9200, 180, 860, 384)) },
  { name: "the note is a whole sentence", check: SHORT, mustPass: false, verdicts: () => judged(writing("If any one check fails the request stops and gets an error", 9200, 60)) },
];
