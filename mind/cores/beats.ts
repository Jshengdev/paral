import type { MarkKind } from "../../seam/schema.ts";
import { locate, type Box, type Display, type ReadLine } from "./ground.ts";
import { holdsResult } from "./push.ts";

type Pointed = { kind: MarkKind; index: number | null; quote: string; label: string | null; toIndex?: number | null; toQuote?: string | null };
type Reply = { result: string | null; beats: { say: string; mark: Pointed | null }[] };

export type Planned = { say: string; mark: { kind: MarkKind; box: Box; label: string | null; line: string } | null };

/**
 * How far a ring's ink reaches above and below its line: a share of the line's height plus a fixed number of points.
 * `snug` is the least gap, in points, in which a box's edge fits between two lines.
 */
export type Reach = { share: number; points: number; snug: number };

/**
 * The mark that fits the room around a line. A ring stands taller than its line, so where the nearest line above or
 * below is closer than the ring's reach it would run over that line. There the mark is a box that hugs the line
 * instead; and where the lines are closer than a box's own edge needs, it is an underline, which needs only the gap
 * below. Lines beside it, in another column, do not count. `scale` is picture pixels to a point.
 */
export function fitted(kind: MarkKind, text: string, lines: ReadLine[], reach: Reach, scale: number): MarkKind {
  const line = lines.find((read) => read.text === text);
  if (kind !== "ring" || line === undefined) return kind;
  const { x, y, w, h } = line.box;
  const gaps = lines
    .filter((other) => other !== line && other.box.x < x + w && x < other.box.x + other.box.w)
    .map((other) => Math.max(other.box.y - (y + h), y - (other.box.y + other.box.h)));
  const nearest = Math.min(...gaps, Infinity);
  if (nearest < reach.snug * scale) return "underline";
  return nearest < reach.share * h + reach.points * scale ? "box" : "ring";
}

/** The most words a spoken sentence may have: plain, and when it works a step with numbers, which are slower to say. */
export type Limits = { plain: number; withNumbers: number };

/** No limit: a lesson's one sentence is never cut. */
export const WHOLE: Limits = { plain: Infinity, withNumbers: Infinity };

/** Words that can open a sentence of their own after "so", "and" or "but": a subject, or "then" before one. */
const SUBJECT = /^(i|you|he|she|it|we|they|the|a|an|this|that|these|those|your|its|their|there|each|every|both|all|then|[a-z])$/i;

/**
 * A spoken sentence over its limit is cut into two only where both parts stand as sentences: after a colon or a
 * semicolon, or at a comma before "so", "and" or "but" when a subject follows ("..., so y equals 13"). It is cut at
 * the last such place at or before the limit, or failing that the first one after it; the rest is said next. A
 * comma alone is no place to cut ("..., which is 13" stays whole), and with no place at all the sentence is left as it is.
 */
export function split(sentence: string, limits: Limits): string[] {
  const words = sentence.trim().split(/\s+/);
  // "With numbers" means a worked step: three numbers or more. One number, or the word "equals", does not count.
  const limit = (sentence.match(/\d+/g)?.length ?? 0) >= 3 ? limits.withNumbers : limits.plain;
  if (words.length <= limit) return [sentence.trim()];
  const places: number[] = [];
  for (let first = 4; first <= words.length - 3; first++) {
    const before = words[first - 1];
    const joins = /,$/.test(before) && /^(so|and|but)$/i.test(words[first]) && SUBJECT.test(words[first + 1] ?? "");
    if (/[;:]$/.test(before) || joins) places.push(first);
  }
  const first = places.filter((place) => place <= limit).at(-1) ?? places[0];
  if (first === undefined) return [sentence.trim()];
  const rest = words.slice(first).join(" ");
  return [words.slice(0, first).join(" ").replace(/[,;:]$/, "") + ".", ...split(rest[0].toUpperCase() + rest.slice(1), limits)];
}

export function hint(reply: Reply, maxBeats: number, maxWords: Limits): string[] {
  return reply.beats.slice(0, maxBeats).flatMap((beat) => split(beat.say, maxWords));
}

const around = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** Each sentence keeps its mark when its line is found and no earlier sentence has marked that line. A bracket may run from one line to another. */
export function explain(reply: Reply, lines: ReadLine[], display: Display, minScore: number, maxBeats: number, reach: Reach, maxWords: Limits): Planned[] {
  const marked = new Set<string>();
  const whole = reply.beats.slice(0, maxBeats).map(({ say, mark }): Planned => {
    if (mark === null) return { say, mark: null };
    const from = locate(mark.quote, lines, display, minScore, mark.index);
    if (!from.found || marked.has(from.line)) return { say, mark: null };
    marked.add(from.line);
    const to = mark.kind === "bracket" && mark.toQuote ? locate(mark.toQuote, lines, display, minScore, mark.toIndex ?? null) : null;
    return { say, mark: { kind: fitted(mark.kind, from.line, lines, reach, display.scale), box: to?.found ? around(from.box, to.box) : from.box, label: mark.label, line: from.line } };
  });
  // A sentence too long to say in one breath becomes two; its mark stays with the first part.
  return whole.flatMap(({ say, mark }) => split(say, maxWords).map((part, index) => ({ say: part, mark: index === 0 ? mark : null })));
}

/**
 * A board's boxes as they will be drawn. The painter draws the arrow between two boxes, so an arrow sign the model
 * wrote at the start or the end of a box's own words is taken off; a box left empty by that is dropped, and so is a
 * row left with no box.
 */
export function boxes(rows: string[][]): string[][] {
  const arrows = /^(\s*(→|⇒|➜|->|=>)\s*)+|(\s*(→|⇒|➜|->|=>)\s*)+$/g;
  return rows.map((row) => row.map((box) => box.replace(arrows, "").trim()).filter(Boolean)).filter((row) => row.length > 0);
}

export function givesAway(planned: Planned[], result: string | null): boolean {
  if (result === null) return false;
  return planned.some(({ say, mark }) => holdsResult(say, result) || (mark?.label != null && holdsResult(mark.label, result)));
}

/** What was drawn before stays through a follow-up. It goes when the problem is new, or when the line that was wrong is no longer the wrong one. */
export function wipes(newProblem: boolean, lastBreak: string | null, nowBreak: string | null): boolean {
  return newProblem || (lastBreak !== null && lastBreak !== nowBreak);
}
