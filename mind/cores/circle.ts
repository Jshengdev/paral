import { toPoints, type Box, type Display, type ReadLine } from "./ground.ts";

export type Point = { x: number; y: number };
export type Least = { points: number; side: number; share: number };

/** The box around his path, in the display points the path came in. */
export function boxOf(trail: Point[]): Box {
  const xs = trail.map((point) => point.x);
  const ys = trail.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(Math.max(...xs) - x, 1), h: Math.max(Math.max(...ys) - y, 1) };
}

/** Whether his path is a drawing at all: enough points, and at least `side` points wide or tall. Less is a slip of the hand. */
export function drew(trail: Point[], least: Least): boolean {
  if (trail.length < least.points) return false;
  const box = boxOf(trail);
  return box.w >= least.side || box.h >= least.side;
}

/** How much of each line lies inside the box around his path, 0 to 1. Empty when the path is a slip of the hand. */
function shares(trail: Point[], lines: ReadLine[], display: Display, least: Least): number[] {
  if (!drew(trail, least)) return [];
  const xs = trail.map((point) => (point.x - display.x) * display.scale);
  const ys = trail.map((point) => (point.y - display.y) * display.scale);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return lines.map((line) => {
    const w = Math.min(box.x + box.w, line.box.x + line.box.w) - Math.max(box.x, line.box.x);
    const h = Math.min(box.y + box.h, line.box.y + line.box.h) - Math.max(box.y, line.box.y);
    return w <= 0 || h <= 0 ? 0 : (w * h) / (line.box.w * line.box.h);
  });
}

const numbered = (shares: number[], ok: (share: number) => boolean) => shares.flatMap((share, index) => (ok(share) ? [index] : []));

/**
 * The lines his path went around, by their number in the list. The path is taken as the box around it. A line counts
 * when at least `share` of it lies inside that box; when no line does, the lines the box touches count instead (he
 * drew around part of a line). A path with too few points, or smaller than `side` both ways, is a slip of the hand
 * and gives nothing.
 */
export function circled(trail: Point[], lines: ReadLine[], display: Display, least: Least): number[] {
  const inside = shares(trail, lines, display, least);
  const whole = numbered(inside, (share) => share >= least.share);
  return whole.length > 0 ? whole : numbered(inside, (share) => share > 0);
}

export type Echo = { box: Box; shape: "loop" | "ring" | "box" };

/**
 * How his own loop is drawn back to him, in display points. Around one whole line it is the ring a line gets, or a
 * box where `tight` says a ring would run over the lines beside it; around several it is one rounded box around them; and when it holds no whole
 * line (a word, a picture, or the page was not read yet) it is his loop itself. A slip of the hand comes back as nothing.
 */
export function echo(trail: Point[], seen: { lines: ReadLine[]; display: Display } | null, least: Least, tight: (line: ReadLine) => boolean = () => false): Echo | null {
  if (!drew(trail, least)) return null;
  const whole = seen ? numbered(shares(trail, seen.lines, seen.display, least), (share) => share >= least.share) : [];
  if (seen === null || whole.length === 0) return { box: boxOf(trail), shape: "loop" };
  const boxes = whole.map((index) => toPoints(seen.lines[index].box, seen.display));
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const box = { x, y, w: Math.max(...boxes.map((box) => box.x + box.w)) - x, h: Math.max(...boxes.map((box) => box.y + box.h)) - y };
  return { box, shape: whole.length === 1 && !tight(seen.lines[whole[0]]) ? "ring" : "box" };
}
