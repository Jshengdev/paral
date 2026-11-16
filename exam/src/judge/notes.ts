import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import { of, spoken, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C24: it writes on the board with its pointer as it talks. His click of 2026-11-15, 18:47, from the reference's
// video and its help page:
//   20:56 to 20:58  beside the column of steps, as it says what happens when a check fails, its pointer comes onto
//                   the board and writes a short note in red next to a box: "Chec", then "Check fa".
//   24:10 to 24:14  under the fifth row its pointer writes "After response → Record click": "Afte", "After resp",
//                   "After response →", "After response → Reco", "After response → Record clic". Five to six letters
//                   a second. Then the sixth row is drawn.
//   13:22           a line of words under the last rows.
//   its help page   "Each label is written in chalk beside the drawing the moment it names that part"; "its pointer
//                   rides the chalk".
//
// A note is the painter's, so all of this is read from the film's record: a note is listed (`what: "note"`, its id
// "<board id>/note/<n>", what it `says` so far, its `box`) each time its words grow; the pointer is listed as it is
// today (`what: "pointer"`).

// The video writes five to six letters a second. At more than twice that it no longer reads as writing.
const LETTERS_A_SECOND = 12;
// The video's notes are four words and an arrow at most ("After response → Record click").
const WORDS = 5;
const letters = (says: string) => says.replace(/\s/g, "").length;
const overlap = (a: Placed["box"], b: Placed["box"]) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const inside = (a: Placed["box"], b: Placed["box"]) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** `until` is where this ask's stretch of the film ends. */
export function notes(ask: Ask, expect: Expect, placed: Placed[], until: number): Verdict[] {
  if (!expect.notes) return [];
  const s = ask.index;
  const mine = (what: string) => placed.filter((p) => p.what === what && p.at >= ask.down && p.at < until);
  const board = mine("board").at(-1);
  const written = "As it talks it writes a note on the board";
  if (!board) return [no("C24", s, written, "no board was drawn")];
  const listings = mine("note").filter((p) => (p.id ?? "").startsWith(`${board.id}/`));
  const ids = [...new Set(listings.map((p) => p.id))];
  if (ids.length === 0) return [no("C24", s, written, "the film's record names no note")];
  const openers = new Set(of(ask.moments, "say").filter((m) => m.opener).map((m) => m.id));
  const said = spoken(ask).filter((sentence) => !openers.has(sentence.of));
  const boxes = mine("box").filter((p) => (p.id ?? "").startsWith(`${board.id}/`));
  const pointers = mine("pointer");
  const out: Verdict[] = [yes("C24", s, written, `${ids.length} ${ids.length === 1 ? "note" : "notes"}: ${ids.map((id) => `"${listings.filter((p) => p.id === id).at(-1)!.says ?? ""}"`).join(", ").slice(0, 110)}`)];
  const fault = (check: (grown: Placed[], last: Placed, says: string) => string | null) => {
    for (const id of ids) {
      const grown = listings.filter((p) => p.id === id), last = grown.at(-1)!;
      const found = check(grown, last, (last.says ?? "").trim());
      if (found) return `"${(last.says ?? "").trim().slice(0, 40)}": ${found}`;
    }
    return null;
  };
  const verdict = (what: string, found: string | null, good: string) => (found === null ? yes("C24", s, what, good) : no("C24", s, what, found));
  out.push(verdict("A note is written a few letters at a time, never popped in whole", fault((grown, last, says) => {
    if (grown.length < 3) return `it came in ${grown.length} ${grown.length === 1 ? "piece" : "pieces"}`;
    const seconds = (last.at - grown[0].at) / 1000;
    return letters(says) > LETTERS_A_SECOND * seconds ? `${letters(says)} letters in ${seconds.toFixed(1)} s` : null;
  }), `at ${LETTERS_A_SECOND} letters a second or slower (the video writes five to six)`));
  out.push(verdict("Its pointer rides the writing", fault((grown) => {
    // At each moment the note grows, the pointer is on the end of the writing: within its own width of the note's right edge.
    const off = grown.find((g) => {
      const p = pointers.filter((x) => x.at <= g.at).at(-1);
      return !p || Math.hypot(p.box.x + p.box.w / 2 - (g.box.x + g.box.w), p.box.y + p.box.h / 2 - (g.box.y + g.box.h / 2)) > p.box.w;
    });
    return off ? `at ${Math.round(off.at)} ms the pointer was not at the end of the writing` : null;
  }), "the pointer is at the end of the writing each time it grows"));
  out.push(said.length === 0 ? unseen("C24", s, "A note is written while the answer is being said", "nothing was voiced, so no sentence has a time")
    : verdict("A note is written while the answer is being said", fault((grown, last) => (grown[0].at < said[0].start ? "it began before the answer did" : last.at > said.at(-1)!.end ? "it was still being written after the answer had ended" : null)), "each begins and ends inside the answer"));
  out.push(verdict("A note is on the board and over none of its boxes", fault((_, last) => (!inside(last.box, board.box) ? "it runs off the board" : boxes.some((b) => overlap(last.box, b.box) > 0) ? "it lies over a box" : null)),
    boxes.length > 0 ? "inside the card, clear of every box" : "inside the card (the film names no boxes for this board)"));
  out.push(verdict("A note is a few words", fault((_, __, says) => (says.split(/\s+/).filter((w) => /\w/.test(w)).length > WORDS ? `${says.split(/\s+/).filter((w) => /\w/.test(w)).length} words` : null)), `${WORDS} words or fewer`));
  return out;
}
