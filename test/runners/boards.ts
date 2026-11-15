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
export function boardType(input: { rows: Written[] }) {
  const dir = handWritten("board-type", input.rows);
  const tokens = join(root, "body", "tokens.json");
  execFileSync(headless, ["film", dir, tokens], { encoding: "utf8" });
  const asked: number = JSON.parse(readFileSync(tokens, "utf8")).board.type;
  const boards = readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((item) => item.what === "board");
  const last = new Map<string, { type?: number }>(boards.map((item) => [item.id, item]));
  return Object.fromEntries([...last].map(([id, item]) => [id, item.type === undefined ? "the record does not say" : item.type === asked ? "at the tokens' size" : item.type < asked ? "smaller than the tokens' size" : "larger than the tokens' size"]));
}
