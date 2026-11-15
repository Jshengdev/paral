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

/**
 * The first five mark a line or a thing. `tick` says a line is done, `strike` that it has passed (the one mark that
 * crosses words), and `tag` is a chip of two or three words (`label`) beside the line, in a `tone`.
 */
export const MarkKind = z.enum(["ring", "underline", "wavy", "bracket", "box", "tick", "strike", "tag"]);
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
  /** He pressed the left button here, in display points. The mind uses it only to see a click on the box of a step it is showing. */
  z.object({ v, type: z.literal("click"), x: z.number(), y: z.number(), at }),
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
    lookFastMost: z.number().int().nonnegative().optional(),
    /** Lines he can tap instead of saying them, in groups: the body shows them in its menu and sends a tapped one as `typed`.
     * A group may name the `page` it is run on, which the menu offers to open (the body opens only https usc.edu addresses). */
    cues: z.array(z.object({ name: z.string().min(1), page: z.string().min(1).optional(), lines: z.array(z.string().min(1)) })).optional(),
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
    /** Only on a line said without being asked: true when it shows a date he can ask to keep, so the body may offer "Add to calendar". */
    keep: z.boolean().optional(),
    /**
     * One thing the line offers to do for him, as a button on its card: the button's words, and the words the body
     * sends as a `typed` line when it is pressed. `keep: true` is the offer "Add to calendar" / "add it to my calendar".
     */
    offer: z.object({ label: z.string().min(1), send: z.string().min(1) }).optional(),
    rung: z.number().int().nonnegative().optional(),
    of: z.number().int().positive().optional(),
  }),
  z.object({ v, type: z.literal("voice"), id, beat, pcm: z.string(), last: z.boolean().optional() }),
  z.object({ v, type: z.literal("words"), id, beat, words: z.array(z.string()), start: z.array(z.number()), end: z.array(z.number()) }),
  z.object({ v, type: z.literal("mute"), id, why: z.string() }),
  /** A calendar file the mind has written for a date he asked to keep; the body opens it in his calendar app. `label` is the date in a few words ("November 22"), for the body to show. */
  z.object({ v, type: z.literal("open"), id, path: z.string().min(1), label: z.string().optional() }),
  /**
   * `tone` is only on a tag: strong for what is next, quiet for what is done or passed, date for a count of days.
   * `spot` is true for a mark on a place of a drawing (an atom, a bond) and not on a line: no arrow leads from it to
   * the bubble or a card, and the cursor does not ride to it or rest on it.
   */
  /** A page of USC's that he asked to be taken to: the body opens the address in his browser. Only an https address of a usc.edu site. */
  z.object({ v, type: z.literal("go"), id, url: z.string().min(1), label: z.string().optional() }),
  /**
   * He asked to be scrolled to what an arrow points at: the body scrolls the page that way for him until the thing
   * comes into view (a mark lands, or the arrow goes) or it has tried long enough. It needs his Accessibility grant.
   */
  z.object({ v, type: z.literal("scroll"), id, to: z.enum(["up", "down"]), toward: z.string().min(1) }),
  /**
   * He asked for the closed section paral has boxed to be opened: the body clicks once at this point, for him. The
   * point is in the desktop's points, as a mark's box is, so on a display left of the main one it is below zero.
   * `on` is the heading's words. It needs his Accessibility grant.
   */
  z.object({ v, type: z.literal("press"), id, x: z.number(), y: z.number(), on: z.string().min(1) }),
  z.object({ v, type: z.literal("mark"), id, beat, kind: MarkKind, box: Box, label: z.string().optional(), tone: z.enum(["strong", "quiet", "date"]).optional(), spot: z.boolean().optional() }),
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
