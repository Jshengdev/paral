// The runner for rows about the arrow that leads from a mark to what speaks about it: moments of a hand-written run
// on a drawn page, through the real scene and painter. No mind, no service, no window.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { at, DISPLAY, textOf, type Box } from "./placed.ts";

type Point = [number, number];
const within = (p: Point, b: Box) => p[0] > b.x && p[0] < b.x + b.w && p[1] > b.y && p[1] < b.y + b.h;
const apart = (p: Point, b: Box) => Math.hypot(Math.max(b.x - p[0], p[0] - (b.x + b.w), 0), Math.max(b.y - p[1], p[1] - (b.y + b.h), 0));
const long = (path: Point[]) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

/** A row names the line a mark is on by its number (`on`); the page is drawn once to learn where that line is. */
export function onTheirLines(rows: Written[], lines: string[]): Written[] {
  const text = textOf(handWritten("lead-page", [], lines));
  return rows.map((row) => {
    if (row.line.type !== "mark" || typeof row.line.on !== "number") return row;
    const { on, ...line } = row.line;
    return { at: row.at, line: { ...line, box: text[on] } };
  });
}

/**
 * The arrow at each moment: which line of the page it leaves, what it leads to, whether its ink is growing, standing
 * still or going back just then (read from a second look a twentieth of a second later), and whether it keeps clear
 * of every read line's words, the line it leaves among them, and off the board and inside the display. Clear of the
 * words means no point of the pen's path is nearer a line's box than half the pen's width, its paper edge and the
 * room the tokens ask for (`lead.clear`).
 */
export function lead(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("lead", onTheirLines(input.rows, input.lines), input.lines);
  const text = textOf(dir);
  const tokens = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "body", "tokens.json"), "utf8"));
  const room = tokens.mark.width / 2 + tokens.way.halo + tokens.lead.clear - 0.01;
  const inked = (moment: { placed: { what: string; path?: Point[] }[] }) => long(moment.placed.find((item) => item.what === "lead")?.path ?? []);
  const soonAfter = at(dir, input.at.map((moment) => moment + 50)).map(inked);
  return at(dir, input.at).map((moment, index) => {
    const arrow = moment.placed.find((item) => item.what === "lead");
    const path = arrow?.path ?? [];
    if (!arrow || path.length < 2) return { arrow: null };
    const fromLine = text.map((line, index) => ({ index, far: apart(path[0], line) })).sort((a, b) => a.far - b.far)[0].index;
    const board = moment.placed.find((item) => item.what === "board")?.box;
    const change = soonAfter[index] - inked(moment);
    return {
      arrow: {
        fromLine,
        toward: arrow.id?.endsWith(">guide") ? "the guide's card" : "the capsule",
        ink: change > 0.5 ? "growing" : change < -0.5 ? "going back" : "still",
        clearOfEveryLinesWords: path.every((p) => text.every((line) => apart(p, line) >= room)),
        onTheBoard: board ? path.some((p) => within(p, board)) : false,
        insideTheDisplay: path.every((p) => p[0] >= 0 && p[1] >= 0 && p[0] <= DISPLAY.w && p[1] <= DISPLAY.h),
      },
    };
  });
}
