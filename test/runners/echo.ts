// The runner for rows about a walk's mark that waits for his click: moments of a hand-written run on a drawn page,
// through the real scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { onTheirLines } from "./leads.ts";
import { at, textOf, type Box } from "./placed.ts";

type Point = [number, number];
const root = join(import.meta.dirname, "..", "..");
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const within = (p: Point, b: Box) => p[0] > b.x && p[0] < b.x + b.w && p[1] > b.y && p[1] < b.y + b.h;
const long = (path: Point[] = []) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

/**
 * The newest mark at each moment: which line of the page it is on, whether the pen is still drawing it or it is
 * whole (read from a second look a twentieth of a second later), and the echo of its edge just then: none, or how
 * many points it reaches beyond the mark at its sides, and above and below, and whether any of it lies on a line of
 * the page other than the ones the mark is on. Then the same moments with motion reduced: how many show an echo.
 */
export function waiting(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("echo", onTheirLines(input.rows, input.lines), input.lines);
  const text = textOf(dir);
  type Item = { what: string; id?: string; box: Box; path?: Point[] };
  const newest = (moment: { placed: Item[] }) => moment.placed.filter((item) => item.what === "mark").at(-1);
  const soonAfter = at(dir, input.at.map((moment) => moment + 50)).map((moment) => long(newest(moment)?.path));
  const shown = at(dir, input.at).map((moment, index) => {
    const mark = newest(moment);
    if (!mark) return { mark: null };
    const pulse = (moment.placed as Item[]).find((item) => item.what === "pulse" && item.id === mark.id);
    const others = text.filter((line) => !touches(line, mark.box));
    return {
      mark: {
        onLine: text.findIndex((line) => touches(line, mark.box)),
        ink: soonAfter[index] - long(mark.path) > 0.5 ? "being drawn" : "whole",
        echo: !pulse ? "none" : { beyondItsSides: Math.round((pulse.box.w - mark.box.w) * 5) / 10, aboveAndBelow: Math.round((pulse.box.h - mark.box.h) * 5) / 10, onOtherWords: (pulse.path ?? []).some((point) => others.some((line) => within(point, line))) },
      },
    };
  });
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: true } }));
  const reduced: { placed: { what: string }[] }[] = JSON.parse(execFileSync(join(root, "body", ".build", "debug", "paral-headless"), ["placed", dir, join(dir, "tokens.json"), ...input.at.map(String)], { encoding: "utf8" }));
  return { shown, echoesWithMotionReduced: reduced.filter(({ placed }) => placed.some((item) => item.what === "pulse")).length };
}
