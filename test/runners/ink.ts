// Runners for rows about the page's own ink at the foot: words the reader did not read, or a drawing, which the
// pill and its bubble keep off as they keep off the read lines; and the lines the mind is sent, which do not change.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, session, type Written } from "./body.ts";
import { at, DISPLAY, type Box } from "./placed.ts";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const page = (path: string, lines: string[]): Box[] => JSON.parse(execFileSync(headless, ["page", path, ...lines], { encoding: "utf8" })).lines.map((line: { box: Box }) => line.box);

/**
 * A page drawn with `ink` (lines of text standing for a drawing) whose look says it holds no read line, so the only
 * thing that can keep the pill off them is the page's own ink. At each moment: the capsule's look, whether the pill
 * is at the display's middle, and whether the pill or its bubble lies on any of that ink.
 */
export function pillOnInk(input: { ink: string[]; rows: Written[]; at: number[] }) {
  const look: Written = { at: 0, line: { type: "look", at: 1, display: { id: 2, scale: 1, x: 0, y: 0 }, picture: { path: "page.png", w: 1600, h: 1000 }, lines: [] } };
  const dir = handWritten("pill-ink", [look, ...input.rows]);
  const drawn = page(join(dir, "page.png"), input.ink);
  return at(dir, input.at).map(({ placed, capsule }) => {
    const pill = placed.find((item) => item.what === "capsule")!.box;
    const bubble = placed.find((item) => item.what === "bubble")?.box;
    return {
      look: capsule.look,
      atTheMiddle: Math.abs(pill.x + pill.w / 2 - DISPLAY.w / 2) < 0.5,
      pillOnTheInk: drawn.some((box) => touches(box, pill)),
      bubbleOnTheInk: bubble ? drawn.some((box) => touches(box, bubble)) : null,
    };
  });
}

/**
 * A scripted run on a tape over a drawn page, a look and then a typed ask: for every look and screen line the mind
 * was sent, how many lines it held and how many of them had no words, against what the Mac reads off the page.
 */
export function linesToTheMind(input: { lines: string[]; tape: string; typed: string }) {
  const dir = fresh("mind-lines");
  mkdirSync(dir, { recursive: true });
  page(join(dir, "page.png"), input.lines);
  const read = JSON.parse(execFileSync(headless, ["read", join(dir, "page.png")], { encoding: "utf8" })).lines.length;
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page: join(dir, "page.png"), asks: [{ look: true, waitMs: 300 }, { typed: input.typed }] }));
  execFileSync("./flow", [join(dir, "flow.json")], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  const sent = session(dir).filter((line) => line.type === "look" || line.type === "screen");
  return { readOffThePage: read, sent: sent.map((line) => ({ type: line.type, lines: line.lines.length, withNoWords: line.lines.filter((l: { text: string }) => l.text === "").length })) };
}
