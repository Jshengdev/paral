import { boxes, split, type Limits } from "./beats.ts";
import { asksFor } from "./catch.ts";

// A board that grows with its answer: asked for the whole thing drawn, the answer is told in more sentences than an
// ordinary one and its board has a row for each, drawn as that sentence is said.

/** The board as it will be drawn: as written, without empty boxes or rows, and at most `most` rows. */
export const wholeRows = (written: string[][] | null | undefined, most: number): string[][] => boxes(written ?? []).slice(0, most);

/**
 * For each sentence the model wrote, the place among the spoken sentences of its first part. A sentence too long to
 * say in one breath is spoken as two; its row comes with the first.
 */
export function firstParts(says: string[], limits: Limits): number[] {
  let at = 0;
  return says.map((say) => {
    const first = at;
    at += split(say, limits).length;
    return first;
  });
}

/** The beats of the rows that have a sentence so far, and whether the board has stopped growing. */
export type Growing = { beats: number[]; stopped: boolean };

/**
 * One spoken sentence has gone by: `place` is its place among the spoken sentences and `beat` the beat it was said
 * on, or null when it was held back and not said. Gives the board's growth after it; the same value back when
 * nothing changes. Row k comes with the first part of the model's sentence k and with nothing else. A sentence that
 * was held back takes its row with it, and every row after: a board grows only downward, and a row no sentence said
 * is never drawn. There are `rows` rows; a sentence past the last of them brings none.
 */
export function grow(now: Growing, rows: number, firsts: number[], place: number, beat: number | null): Growing {
  const row = firsts.indexOf(place);
  if (now.stopped || row === -1 || row >= rows || row !== now.beats.length) return now;
  return beat === null ? { ...now, stopped: true } : { beats: [...now.beats, beat], stopped: false };
}

// A column: asked to draw the steps it has just explained, the board is one box to a row, joined downward.

/**
 * Whether an ask is for a drawing of what was just said: an answer came before it in this conversation (`shown`, the
 * sentences said since the problem was read), his words ask for a drawing ("Draw a quick diagram."), and they do not
 * say for themselves what the drawing should show (`names`: "... of how sign in and the stats connect"). The same
 * words as a first question are an ordinary ask. Whether his words name their own subject is told here and not left
 * to the model: on its first live run the model drew a column for a drawing of how three named things connect.
 */
export function drawsWhatWasSaid(words: string, phrases: string[], shown: string[], names: string[] = []): boolean {
  return shown.length > 0 && asksFor(words, phrases) && !asksFor(words, names);
}

/**
 * The board as a column, or null when the model did not write one: a column is two rows or more with one box in
 * each, and no box holds an arrow of its own ("Sign up → dashboard" is two steps in one box, and reads as a row).
 * It is cut to `most` rows. Any other board is drawn as boards always were.
 */
export function columnRows(written: string[][] | null | undefined, most: number): string[][] | null {
  const rows = boxes(written ?? []);
  return rows.length >= 2 && rows.every((row) => row.length === 1 && !/→|->|=>|⇒/.test(row[0])) ? rows.slice(0, most) : null;
}

// Words alone: asked to be shown what a thing would look like, the board is each example written whole, a line at a time.

/**
 * The board as written lines, or null when the model did not write one: every row is one box, which holds a whole
 * example. It is cut to `most` lines. Any other board is drawn as boards always were.
 */
export function writtenRows(written: string[][] | null | undefined, most: number): string[][] | null {
  const rows = boxes(written ?? []);
  return rows.length >= 1 && rows.every((row) => row.length === 1) ? rows.slice(0, most) : null;
}

// Notes written on a board. On a column, and on a board that grows with its answer, the model may add a note or two:
// a few words paral's pointer writes on the board as the sentence about them is said. The reply's shape has no place
// for them (a second shape for some asks would also lose what the service has kept), so the model writes a note as
// one more box in a row, beginning "note:", and they are lifted out here.

/** A note: the row it belongs to, from 0, its words, and the sentence (the `say` line's beat) it is written with, once that has come. */
export type Note = { row: number; says: string; beat?: number };

const NOTE = /^\s*note\s*:\s*/i;

/**
 * Lifts the notes out of a board as the model wrote it. A box that begins "note:" is a note of the row it stands
 * in; in a row of its own it is a note of the row before, and one that comes before any row is dropped. A note of no
 * words is dropped, a longer one is cut to `words` words, a row keeps only its first note, and only the first `most`
 * are kept, in the board's order. Gives the rows without them (a row left empty goes) and the notes, each with the
 * number of its row among the rows that are left.
 */
export function lifted(written: string[][], most: number, words: number): { rows: string[][]; notes: Note[] } {
  const rows: string[][] = [];
  const notes: Note[] = [];
  for (const row of written) {
    const boxes = row.filter((box) => !NOTE.test(box) && box.trim() !== "");
    if (boxes.length > 0) rows.push(boxes);
    for (const box of row.filter((text) => NOTE.test(text))) {
      const says = box.replace(NOTE, "").trim().split(/\s+/).filter(Boolean).slice(0, words).join(" ");
      if (says !== "" && rows.length > 0 && notes.length < most && !notes.some((note) => note.row === rows.length - 1)) notes.push({ row: rows.length - 1, says });
    }
  }
  return { rows, notes };
}

/**
 * A column's notes, each with its beat once its sentence has been said. A column comes whole with the first
 * sentence, so its notes come with the sentences after it: the first note with the second sentence, the second with
 * the third. `beats` are the beats of the answer's sentences said so far, in order.
 */
export function columnNotes(notes: Note[], beats: number[]): Note[] {
  return notes.map(({ row, says }, index) => (beats[index + 1] === undefined ? { row, says } : { row, says, beat: beats[index + 1] }));
}

/**
 * The notes of a board that grows with its answer, each with its beat once its row has one: a note of row k is
 * written with row k's own sentence, when the row is up. `beats` are the beats of the rows that have a sentence so far.
 */
export function rowNotes(notes: Note[], beats: number[]): Note[] {
  return notes.map(({ row, says }) => (beats[row] === undefined ? { row, says } : { row, says, beat: beats[row] }));
}
