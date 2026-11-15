// The runner for rows about the arrow that says which way to scroll: a hand-written run on a drawn page, looked at
// at given moments through the real scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { handWritten, session, type Written } from "./body.ts";

type Box = { x: number; y: number; w: number; h: number };
type Moment = { placed: { what: string; id?: string; box: Box }[]; way: { id: string; to: string; toward: string; drawn: number } | null };

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const DISPLAY = { w: 1600, h: 1000 };
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * At each moment: whether the arrow is up and, if it is, what it leads to, how far the pen has inked it, which edge
 * of the display it sits at, and whether it lies on the page's text, the capsule or the board.
 */
export function way(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("way", input.rows, input.lines);
  const text: Box[] = session(dir)[0].lines.map((line: { box: Box }) => line.box);
  const moments: Moment[] = JSON.parse(execFileSync(headless, ["placed", dir, join(root, "body", "tokens.json"), ...input.at.map(String)], { encoding: "utf8" }));
  return moments.map(({ placed, way }) => {
    const arrow = placed.find((item) => item.what === "way")?.box;
    if (!way || !arrow) return { arrow: null };
    const on = (what: string) => placed.some((item) => item.what === what && touches(item.box, arrow));
    const middle = arrow.y + arrow.h / 2;
    return {
      arrow: {
        to: way.to,
        toward: way.toward,
        inked: way.drawn <= 0 ? "none" : way.drawn < 1 ? "part" : "whole",
        edge: middle > (DISPLAY.h * 2) / 3 ? "bottom" : middle < DISPLAY.h / 3 ? "top" : "neither",
        insideTheDisplay: arrow.x >= 0 && arrow.y >= 0 && arrow.x + arrow.w <= DISPLAY.w && arrow.y + arrow.h <= DISPLAY.h,
        onText: text.some((line) => touches(line, arrow)),
        onTheCapsule: on("capsule"),
        onTheBoard: on("board"),
      },
    };
  });
}
