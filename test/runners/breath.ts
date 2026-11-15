// The runner for rows about a walk's mark that waits for his click: moments of a hand-written run on a drawn page,
// through the real scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { onTheirLines } from "./leads.ts";
import { at, textOf, type Box } from "./placed.ts";

const root = join(import.meta.dirname, "..", "..");
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const long = (path: [number, number][] = []) => path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);

/**
 * The newest mark at each moment: which line of the page it is on, whether the pen is still drawing it or it is
 * whole (read from a second look a twentieth of a second later), and how many points its breath reaches beyond its
 * ink just then, 0 for none. Then the same moments with motion reduced: how many of them show a breath.
 */
export function breath(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("breath", onTheirLines(input.rows, input.lines), input.lines);
  const text = textOf(dir);
  const newest = (moment: { placed: { what: string; id?: string; box: Box; path?: [number, number][] }[] }) => moment.placed.filter((item) => item.what === "mark").at(-1);
  const soonAfter = at(dir, input.at.map((moment) => moment + 50)).map((moment) => long(newest(moment)?.path));
  const shown = at(dir, input.at).map((moment, index) => {
    const mark = newest(moment);
    if (!mark) return { mark: null };
    const swell = moment.placed.find((item) => item.what === "breath" && item.id === mark.id)?.box;
    return {
      mark: {
        onLine: text.findIndex((line) => touches(line, mark.box)),
        ink: soonAfter[index] - long(mark.path) > 0.5 ? "being drawn" : "whole",
        breathReaches: swell ? Math.round(swell.w - mark.box.w) / 2 : 0,
      },
    };
  });
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: true } }));
  const reduced: { placed: { what: string }[] }[] = JSON.parse(execFileSync(join(root, "body", ".build", "debug", "paral-headless"), ["placed", dir, join(dir, "tokens.json"), ...input.at.map(String)], { encoding: "utf8" }));
  return { shown, breathsWithMotionReduced: reduced.filter(({ placed }) => placed.some((item) => item.what === "breath")).length };
}
