import { boxes, split, type Limits } from "./beats.ts";

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
