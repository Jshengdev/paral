// The runner for rows about what a film's record says of a board: a hand-written run, filmed. No mind, no service.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");

/**
 * For each board of a hand-written run, by its id: whether the film's record says how large its words were drawn,
 * and how that size stands to the size the tokens ask for (a card too wide for its room is shrunk, words and all).
 */
export function boardType(input: { rows: Written[]; lines?: string[] }) {
  const dir = handWritten("board-type", input.rows, input.lines);
  const tokens = join(root, "body", "tokens.json");
  execFileSync(headless, ["film", dir, tokens], { encoding: "utf8" });
  const asked: number = JSON.parse(readFileSync(tokens, "utf8")).board.type;
  const boards = readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((item) => item.what === "board");
  const last = new Map<string, { type?: number }>(boards.map((item) => [item.id, item]));
  return Object.fromEntries([...last].map(([id, item]) => [id, item.type === undefined ? "the record does not say" : item.type === asked ? "at the tokens' size" : item.type < asked ? "smaller than the tokens' size" : "larger than the tokens' size"]));
}

/**
 * Whether a board's card is as tall as the rows it shows need: at each moment of a hand-written run, the card's
 * height against the height of a card drawn alone from `asTall[i]` (the rows it should be showing then), to half a
 * point, and whether its top is where it was the moment before (it grows downward and does not move).
 */
export function boardFits(input: { lines: string[]; rows: Written[]; at: number[]; asTall: string[][][] }) {
  const tokens = join(root, "body", "tokens.json");
  const card = (dir: string, moments: number[]) =>
    (JSON.parse(execFileSync(headless, ["placed", dir, tokens, ...moments.map(String)], { encoding: "utf8" })) as { placed: { what: string; box: { y: number; h: number } }[] }[]).map(({ placed }) => placed.find((item) => item.what === "board")?.box ?? null);
  const seen = card(handWritten("board-fits", input.rows, input.lines), input.at);
  let top: number | null = null;
  return seen.map((box, index) => {
    const alone = card(handWritten("board-alone", [{ at: 100, line: { type: "board", id: "alone", rows: input.asTall[index] } }], input.lines), [2000])[0];
    if (!box || !alone) return { card: null };
    const stays = top === null || Math.abs(box.y - top) < 0.5;
    top = box.y;
    return { asTallAsItsRowsNeed: Math.abs(box.h - alone.h) < 0.5, topStays: stays };
  });
}
