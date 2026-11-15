// Runners for rows about how things move: the four curves by themselves, and moments of a hand-written run on a
// drawn page, through the real scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { onTheirLines } from "./leads.ts";
import { at, DISPLAY } from "./placed.ts";

type Point = [number, number];
const root = join(import.meta.dirname, "..", "..");
const tokensPath = join(root, "body", "tokens.json");
const long = (path: Point[] = []) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
const places = (value: number, n = 2) => Math.round(value * 10 ** n) / 10 ** n;

/**
 * Each of the four curves in the tokens: its value at the given shares of its time; whether it only ever goes
 * forward, read at a hundred steps; and the furthest it gets, which is past 1 only for a curve that goes past its
 * place and comes back.
 */
export function curves(input: { at: number[] }) {
  const read = (shares: number[]): Record<string, number[]> => JSON.parse(execFileSync(join(root, "body", ".build", "debug", "paral-headless"), ["curves", tokensPath, ...shares.map(String)], { encoding: "utf8" }));
  const shown = read(input.at);
  const fine = read(Array.from({ length: 101 }, (_, step) => step / 100));
  return Object.fromEntries(
    Object.keys(shown).sort().map((name) => [name, { at: shown[name].map((value) => places(value, 3)), onlyGoesForward: fine[name].every((value, step) => step === 0 || value >= fine[name][step - 1]), furthest: places(Math.max(...fine[name]), 3), endsAt: fine[name].at(-1) }]),
  );
}

/**
 * How far things have moved at each moment of a hand-written run, each as a share of its whole way, to two places:
 * how far the capsule is open; how much of the newest mark's stroke is inked; how much of the leading arrow's shaft
 * and of its head; how far the cursor still has to go to where it is at `cursorLandsAt` (or at the last moment asked
 * for), as a share of how far it was at the first moment that shows it; how large its name tag is against its size at the last moment that shows it (0 for no tag); and how far
 * the guide's card has come up; where in the cursor's frame its tip is, as shares of the frame across and down; and
 * how large the cursor is drawn against its size in the tokens. Only what `watch` names is given. The last moment asked for must show each thing whole.
 */
export function moves(input: { lines: string[]; rows: Written[]; at: number[]; watch: string[]; cursorLandsAt?: number }) {
  const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  const dir = handWritten("moves", onTheirLines(input.rows, input.lines), input.lines);
  const moments = at(dir, input.at);
  const mark = (moment: (typeof moments)[number]) => moment.placed.filter((item) => item.what === "mark").at(-1)?.path as Point[] | undefined;
  const arrow = (moment: (typeof moments)[number]) => moment.placed.find((item) => item.what === "lead")?.path as Point[] | undefined;
  const tag = (moment: (typeof moments)[number]) => moment.placed.find((item) => item.what === "tag")?.box.w ?? 0;
  const cursor = (moment: (typeof moments)[number]) => moment.placed.find((item) => item.what === "pointer")?.box;
  const last = moments.at(-1)!;
  // The whole arrow ends with its head, one stroke through three points; what comes before those is its shaft. The
  // record joins the two strokes, so the step from the shaft's end to the head's first barb is taken off.
  const whole = arrow(last) ?? [];
  const head = long(whole.slice(-3)), shaft = long(whole.slice(0, -3)), step = long(whole) - head - shaft;
  const rest = Math.min(tokens.capsule.width, DISPLAY.w - 48) - tokens.capsule.rest;
  const firstShown = moments.find((moment) => moment.pointer)?.pointer;
  const lands = input.cursorLandsAt === undefined ? last.pointer : at(dir, [input.cursorLandsAt])[0].pointer;
  const far = (pointer: { x: number; y: number } | null) => (pointer && lands ? Math.hypot(pointer.x - lands.x, pointer.y - lands.y) : 0);
  const settledTag = moments.map(tag).filter((wide) => wide > 0).at(-1) ?? 1;
  return moments.map((moment) => {
    const inked = long(arrow(moment));
    const all: Record<string, unknown> = {
      capsule: places((moment.placed.find((item) => item.what === "capsule")!.box.w - tokens.capsule.rest) / rest),
      ink: places(long(mark(moment)) / Math.max(long(mark(last)), 1)),
      arrow: { shaft: places(Math.min(inked, shaft) / Math.max(shaft, 1)), head: places(Math.max(inked - shaft - step, 0) / Math.max(head, 1)) },
      cursorToGo: moment.pointer ? places(far(moment.pointer) / Math.max(far(firstShown ?? null), 1)) : null,
      tag: places(tag(moment) / settledTag),
      card: moment.guide ? places(moment.guide.appear) : null,
      cursorTip: moment.pointer && cursor(moment) ? [places((moment.pointer.x - cursor(moment)!.x) / cursor(moment)!.w), places((moment.pointer.y - cursor(moment)!.y) / cursor(moment)!.h)] : null,
      cursorSize: cursor(moment) ? places(cursor(moment)!.w / tokens.cursor.size) : null,
    };
    return Object.fromEntries(input.watch.map((name) => [name, all[name]]));
  });
}

/**
 * What sits at the foot of the display, at each moment of a hand-written run, with no Dock and then with a Dock that
 * takes `inset` points of the foot: how far the open capsule's foot is above the display's, and how much higher the
 * capsule, the way arrow and the toast each sit with the Dock; and whether the board, with the Dock, is wholly
 * above it.
 */
export function lifted(input: { lines: string[]; rows: Written[]; at: number[]; inset: number }) {
  const dir = handWritten("lifted", onTheirLines(input.rows, input.lines), input.lines);
  const bare = at(dir, input.at), docked = at(dir, input.at, false, input.inset);
  return bare.map((moment, index) => {
    const box = (from: (typeof bare)[number], what: string) => from.placed.find((item) => item.what === what)?.box;
    const higher = (what: string) => (box(moment, what) && box(docked[index], what) ? places(box(moment, what)!.y - box(docked[index], what)!.y) : null);
    const capsule = box(moment, "capsule")!, board = box(docked[index], "board");
    return { capsuleFootAboveTheDisplays: places(DISPLAY.h - capsule.y - capsule.h), higherWithTheDock: { capsule: higher("capsule"), way: higher("way"), toast: higher("toast") }, boardAboveTheDock: board ? board.y + board.h <= DISPLAY.h - input.inset : null };
  });
}

/**
 * One moment of a hand-written run drawn at the tokens' sizes and again with the one `scale` set to something else:
 * how large the guide's card, the cursor, the toast and the board then are against their size at a scale of 1 (the
 * card and the board by their width, the cursor by its frame, the toast by its height, which its words do not set).
 */
export function scaled(input: { lines: string[]; rows: Written[]; at: number; scale: number }) {
  const dir = handWritten("scaled", onTheirLines(input.rows, input.lines), input.lines);
  const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, scale: input.scale }));
  const full = at(dir, [input.at])[0].placed;
  const small: typeof full = JSON.parse(execFileSync(join(root, "body", ".build", "debug", "paral-headless"), ["placed", dir, join(dir, "tokens.json"), String(input.at)], { encoding: "utf8" }))[0].placed;
  const size = (from: typeof full, what: string, side: "w" | "h") => from.find((item) => item.what === what)?.box[side] ?? 0;
  const against = (what: string, side: "w" | "h" = "w") => places(size(small, what, side) / Math.max(size(full, what, side), 1));
  return { card: against("guide"), cursor: against("pointer"), toast: against("toast", "h"), board: against("board") };
}

/**
 * The guide's card at each moment of a hand-written run: how strong the card is, 0 to 1, and how many points below
 * its place each of its two lines is just then, the name and then the words (null for a line that has not begun to
 * come). A line's place is where it is at `wholeAt`, a moment that shows the card whole.
 */
export function cardLines(input: { lines: string[]; rows: Written[]; at: number[]; wholeAt: number }) {
  const dir = handWritten("card-lines", onTheirLines(input.rows, input.lines), input.lines);
  type Shown = ReturnType<typeof at>[number];
  const line = (moment: Shown, index: number) => moment.placed.find((item) => item.what === "line" && item.id === `guide/${index}`)?.box;
  const whole = at(dir, [input.wholeAt])[0];
  const low = (moment: Shown, index: number) => (line(moment, index) ? places(line(moment, index)!.y - line(whole, index)!.y, 1) : null);
  return at(dir, input.at).map((moment) => (moment.guide ? { card: places(moment.guide.appear), nameLow: low(moment, 0), wordsLow: low(moment, 1) } : { card: null }));
}
