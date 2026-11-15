import { z } from "zod";

export const SEAM_VERSION = 1;

const v = z.literal(SEAM_VERSION);
const at = z.number().nonnegative();
const id = z.string().min(1);
const beat = z.number().int().min(-2);

export const Box = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });
export type Box = z.infer<typeof Box>;

export const Display = z.object({ id: z.number().int(), scale: z.number().positive(), x: z.number(), y: z.number() });
export type Display = z.infer<typeof Display>;

export const ReadLine = z.object({ text: z.string(), box: Box });
export type ReadLine = z.infer<typeof ReadLine>;

export const MarkKind = z.enum(["ring", "underline", "wavy", "bracket", "box"]);
export type MarkKind = z.infer<typeof MarkKind>;

export const FromBody = z.discriminatedUnion("type", [
  z.object({ v, type: z.literal("hello"), body: z.string() }),
  z.object({ v, type: z.literal("key.down"), at }),
  z.object({ v, type: z.literal("mic"), pcm: z.string(), at }),
  z.object({ v, type: z.literal("trail"), x: z.number(), y: z.number(), at }),
  z.object({ v, type: z.literal("key.up"), at }),
  /** An ask whose words were tapped or typed, not spoken. A `screen` line follows it, as after a press of the key. */
  z.object({ v, type: z.literal("typed"), text: z.string().min(1), at }),
  z.object({ v, type: z.literal("close"), at }),
  z.object({
    v,
    type: z.literal("screen"),
    at,
    display: Display,
    picture: z.object({ path: z.string().min(1), w: z.number().int().positive(), h: z.number().int().positive() }),
    lines: z.array(ReadLine),
  }),
  /** A look with no key pressed: the same as `screen`, sent when what is on the display has changed and then stood still. */
  z.object({
    v,
    type: z.literal("look"),
    at,
    display: Display,
    picture: z.object({ path: z.string().min(1), w: z.number().int().positive(), h: z.number().int().positive() }),
    lines: z.array(ReadLine),
  }),
]);
export type FromBody = z.infer<typeof FromBody>;

export const FromMind = z.discriminatedUnion("type", [
  z.object({
    v,
    type: z.literal("ready"),
    mind: z.string(),
    holdKey: z.enum(["rightOption", "fn", "controlOption"]),
    drawKey: z.enum(["shift", "control", "command"]),
    earGraceMs: z.number().nonnegative(),
    markPad: z.number().nonnegative(),
    pictureLongEdge: z.number().int().positive(),
    /** The room kept round what he drew around when the picture is cut down to that part. */
    cropAround: z.object({ share: z.number().nonnegative(), points: z.number().nonnegative() }),
    /** How often the body looks at the display with no key pressed, to send a `look` when it has changed. Absent or 0: never. */
    lookEveryMs: z.number().nonnegative().optional(),
    /** Lines he can tap instead of saying them, in groups: the body shows them in its menu and sends a tapped one as `typed`. */
    cues: z.array(z.object({ name: z.string().min(1), lines: z.array(z.string().min(1)) })).optional(),
    /** One line that says what this is, for the app to show once when it starts. */
    opening: z.string().min(1).optional(),
  }),
  z.object({ v, type: z.literal("state"), name: z.enum(["idle", "listening", "thinking", "failed"]), detail: z.string().optional() }),
  z.object({ v, type: z.literal("heard"), text: z.string(), final: z.boolean() }),
  z.object({
    v,
    type: z.literal("say"),
    id,
    beat,
    text: z.string().min(1),
    /** True for a line said while he waits (an opener, a stall line): it is no part of the answer. */
    aside: z.boolean().optional(),
    /** Only on a line said without being asked: the steps paral took to get to it, shown small above the line. */
    trail: z.array(z.string().min(1)).optional(),
    rung: z.number().int().nonnegative().optional(),
    of: z.number().int().positive().optional(),
  }),
  z.object({ v, type: z.literal("voice"), id, beat, pcm: z.string(), last: z.boolean().optional() }),
  z.object({ v, type: z.literal("words"), id, beat, words: z.array(z.string()), start: z.array(z.number()), end: z.array(z.number()) }),
  z.object({ v, type: z.literal("mute"), id, why: z.string() }),
  /** A calendar file the mind has written for a date he asked to keep; the body opens it in his calendar app. `label` is the date in a few words ("November 22"), for the body to show. */
  z.object({ v, type: z.literal("open"), id, path: z.string().min(1), label: z.string().optional() }),
  z.object({ v, type: z.literal("mark"), id, beat, kind: MarkKind, box: Box, label: z.string().optional() }),
  /** In place of a mark, when the thing is on this page and not in view: which way to scroll, and the name of what it leads to. `clear` wipes it. */
  z.object({ v, type: z.literal("way"), id, to: z.enum(["up", "down"]), toward: z.string().min(1) }),
  z.object({ v, type: z.literal("echo"), id, box: Box, shape: z.enum(["loop", "ring", "box"]) }),
  /** `now` is only on a board of steps, one to a row: the number of the row, from 0, that is the step he is on. */
  z.object({ v, type: z.literal("board"), id, rows: z.array(z.array(z.string().min(1)).min(1)), now: z.number().int().nonnegative().optional() }),
  z.object({ v, type: z.literal("board.close"), id }),
  z.object({ v, type: z.literal("clip"), id, name: z.string().min(1), clip: z.string().min(1), still: z.string().min(1), seconds: z.number().positive() }),
  z.object({ v, type: z.literal("clear") }),
  /**
   * The demo's guide: what to do next on the page on his screen, step `n` of `of`. An empty `text` means no card.
   * `done` is true on the one line sent when every step has happened. It is not ink on the page: `clear` leaves it.
   */
  z.object({ v, type: z.literal("next"), text: z.string(), n: z.number().int().nonnegative(), of: z.number().int().nonnegative(), done: z.boolean().optional() }),
]);
export type FromMind = z.infer<typeof FromMind>;

export type Read<T> = { ok: true; line: T } | { ok: false; why: string };

export function read<S extends z.ZodType>(schema: S, text: string): Read<z.infer<S>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, why: "not JSON" };
  }
  const result = schema.safeParse(parsed);
  if (result.success) return { ok: true, line: result.data };
  const issue = result.error.issues[0];
  return { ok: false, why: `${issue.path.join(".") || "line"}: ${issue.message}` };
}

export function write<S extends z.ZodType>(schema: S, line: z.infer<S>): string {
  return JSON.stringify(schema.parse(line)) + "\n";
}
