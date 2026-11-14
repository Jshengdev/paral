import type { Box } from "./shape.ts";

// What happened in a run, in the exam's own words, so the judges never read the seam's field names directly.
export type Moment = { at: number } & (
  | { kind: "key-down" }
  | { kind: "key-up" }
  | { kind: "heard"; text: string }
  | { kind: "trail"; x: number; y: number }
  | { kind: "look"; name: string; detail?: string }
  | { kind: "say"; id: string; text: string; opener: boolean; hint: boolean }
  | { kind: "mark"; id: string; mark: string; box: Box; label?: string }
  | { kind: "echo"; box: Box }
  | { kind: "board"; text: string }
  | { kind: "clip"; path: string; seconds: number }
  | { kind: "voice"; of: string; ms: number }
  | { kind: "voiced"; of: string; words: string[] }
  | { kind: "picture"; path: string }
  | { kind: "board-closed" }
  | { kind: "clear" }
  | { kind: "close" }
);

export type Ask = { index: number; moments: Moment[]; down: number; up: number | null };

export const of = <K extends Moment["kind"]>(moments: Moment[], kind: K) => moments.filter((m): m is Extract<Moment, { kind: K }> => m.kind === kind);
export const first = <K extends Moment["kind"]>(moments: Moment[], kind: K) => of(moments, kind)[0] ?? null;

// One ask runs from its key-down to the next key-down, so a cut-in's late lines belong to the ask that cut in.
export function asks(moments: Moment[]): Ask[] {
  const downs = of(moments, "key-down");
  return downs.map((down, index) => {
    const until = downs[index + 1]?.at ?? Infinity;
    const mine = moments.filter((m) => m.at >= down.at && m.at < until);
    return { index, moments: mine, down: down.at, up: first(mine, "key-up")?.at ?? null };
  });
}

// Sound reaches the body faster than it plays, so what he hears is worked out: each sentence plays when its first
// sound has arrived and the one before it has ended.
export type Spoken = { of: string; start: number; end: number };

export function spoken(ask: Ask): Spoken[] {
  const out: Spoken[] = [];
  for (const chunk of of(ask.moments, "voice")) {
    const last = out.at(-1);
    if (last && last.of === chunk.of) last.end += chunk.ms;
    else {
      const start = Math.max(chunk.at, last?.end ?? 0);
      out.push({ of: chunk.of, start, end: start + chunk.ms });
    }
  }
  return out;
}

// With no voice, each line is taken to hold the eye while it is read, one after another. The pace is set fast
// on purpose (the film paces such lines at about 0.5 s a word), so a wait is never hidden by a slow reading.
const READ_MS_A_WORD = 300;

export function shown(ask: Ask): Spoken[] {
  const out: Spoken[] = [];
  for (const line of of(ask.moments, "say")) {
    const start = Math.max(line.at, out.at(-1)?.end ?? 0);
    out.push({ of: line.id, start, end: start + line.text.split(/\s+/).length * READ_MS_A_WORD });
  }
  return out;
}

export const sinceUp = (ask: Ask, moment: Moment | null) => (moment === null || ask.up === null ? null : moment.at - ask.up);
