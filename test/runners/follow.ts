// The runner for rows about paral's cursor beside his own pointer: moments of a hand-written run on a drawn page,
// with the sights of his pointer written beside the record as a scripted run writes them (`pointer.jsonl`), through
// the real scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { onTheirLines } from "./leads.ts";
import { textOf, type Box } from "./placed.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * At each moment: where paral's cursor is against his own pointer (`moves`, [ms, x, y]) and the mark. "beside his
 * pointer" is its tip `cursor.followX` right of and `cursor.followY` below his pointer's tip, to half a point;
 * "on its way" is flying or chasing between those; "by the mark" is within 12 points of the mark's line. Also whether it
 * covers his pointer's tip, whether it lies on the page's text, and whether the ripple that says "here" spreads.
 * `still` plays the run with motion reduced. The record's look is stamped 1 at 0 ms, so a sight at `ms` is stamped `ms + 1`.
 */
export function follow(input: { lines: string[]; rows: Written[]; moves: [number, number, number][]; at: number[]; still?: boolean }) {
  const dir = handWritten("follow", onTheirLines(input.rows, input.lines), input.lines);
  writeFileSync(join(dir, "pointer.jsonl"), input.moves.map(([ms, x, y]) => JSON.stringify({ at: ms + 1, x, y })).join("\n") + "\n");
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: input.still === true } }));
  const text = textOf(dir);
  const moments = JSON.parse(execFileSync(headless, ["placed", dir, join(dir, "tokens.json"), ...input.at.map(String)], { encoding: "utf8" }));
  const { followX, followY } = tokens.cursor;
  return moments.map(({ placed, pointer }: any, index: number) => {
    const drawn = placed.find((item: { what: string }) => item.what === "pointer")?.box;
    if (!pointer || !drawn) return { cursor: null };
    const his = input.moves.filter(([ms]) => ms <= input.at[index]).at(-1);
    const mark = placed.find((item: { what: string }) => item.what === "mark")?.box;
    const beside = his && Math.hypot(pointer.x - his[1] - followX, pointer.y - his[2] - followY) <= 0.5;
    const far = !mark ? Infinity : Math.max(mark.x - pointer.x, pointer.x - (mark.x + mark.w), mark.y - pointer.y, pointer.y - (mark.y + mark.h), 0);
    return {
      cursor: beside ? "beside his pointer" : far <= 12 ? "by the mark" : "on its way",
      coversHisPointer: his ? drawn.x <= his[1] && his[1] <= drawn.x + drawn.w && drawn.y <= his[2] && his[2] <= drawn.y + drawn.h : false,
      onText: text.some((box) => touches(box, drawn)),
      ripple: pointer.ripple === null ? "none" : "spreading",
    };
  });
}
