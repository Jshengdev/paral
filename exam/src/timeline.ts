import type { Box } from "./shape.ts";

// What happened in a run, in the exam's own words, so the judges never read the seam's field names directly.
export type Moment = { at: number } & (
  | { kind: "key-down" }
  | { kind: "key-up" }
  | { kind: "heard"; text: string }
  | { kind: "trail"; x: number; y: number }
  | { kind: "look"; name: string; detail?: string; /** For "voice down": the id of the line the mind marked as shown and not spoken. */ of?: string }
  | { kind: "way"; to: "up" | "down"; toward: string }   // in a mark's place: which way to scroll to a thing not in view
  | { kind: "opened"; path: string }    // a file the mind handed to the Mac to open, such as a calendar file
  | { kind: "glance"; lines: number }   // a look with no key pressed: the body saw the display change and stand still
  | { kind: "say"; id: string; text: string; opener: boolean; hint: boolean; top: boolean; trail?: string[] }   // top: a hint on the last rung of the ladder; trail: the steps shown above a line he did not ask for
  | { kind: "mark"; id: string; mark: string; box: Box; label?: string }
  | { kind: "echo"; box: Box }
  | { kind: "board"; text: string; now?: number }   // now: on a board of steps, the row (from 0) that is the step he is on
  | { kind: "clip"; path: string; seconds: number }
  | { kind: "voice"; of: string; ms: number }
  | { kind: "voiced"; of: string; words: string[] }
  | { kind: "picture"; path: string; lines: number; unread: number }
  | { kind: "board-closed" }
  | { kind: "clear" }
  | { kind: "close" }
);

export type Ask = { index: number; moments: Moment[]; down: number; up: number | null };

export const of = <K extends Moment["kind"]>(moments: Moment[], kind: K) => moments.filter((m): m is Extract<Moment, { kind: K }> => m.kind === kind);
export const first = <K extends Moment["kind"]>(moments: Moment[], kind: K) => of(moments, kind)[0] ?? null;

const starts = (moments: Moment[]) => moments.filter((m) => m.kind === "key-down" || m.kind === "glance");
const stretch = (moments: Moment[], from: number) => {
  const until = starts(moments).find((start) => start.at > from)?.at ?? Infinity;
  return moments.filter((m) => m.at >= from && m.at < until);
};

// One ask runs from its key-down to the next key-down, so a cut-in's late lines belong to the ask that cut in.
// A look with no key ends an ask's stretch too: what a look shows is the look's, not the ask's.
export function asks(moments: Moment[]): Ask[] {
  return of(moments, "key-down").map((down, index) => {
    const mine = stretch(moments, down.at);
    return { index, moments: mine, down: down.at, up: first(mine, "key-up")?.at ?? null };
  });
}

/** A look with no key pressed, and everything shown from it until the next look or press. */
export type Look = { index: number; at: number; moments: Moment[] };

export function looks(moments: Moment[]): Look[] {
  return of(moments, "glance").map((glance, index) => ({ index, at: glance.at, moments: stretch(moments, glance.at) }));
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

/**
 * Which lines the mind marks as shown and not spoken: a line of its own on a card (an offer, or an answer kept on its
 * card). A line is let off only when nothing of its turn's id was voiced, so an answer's own sentence cannot be
 * excused this way.
 */
export function shownOnly(ask: Ask): (id: string) => boolean {
  const turn = (id: string) => id.split(":")[0];
  const marked = new Set(of(ask.moments, "look").filter((m) => m.name === "voice down" && m.of !== undefined).map((m) => m.of));
  const voicedTurns = new Set(of(ask.moments, "voice").map((m) => turn(m.of)));
  return (id) => marked.has(turn(id)) && !voicedTurns.has(turn(id));
}

export const sinceUp = (ask: Ask, moment: Moment | null) => (moment === null || ask.up === null ? null : moment.at - ask.up);
