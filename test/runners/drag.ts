// The runner for rows about a board he drags by its strip: moments of a hand-written run with drags kept beside it,
// how far a drag may go, and the whole chain on a tape, filmed. No service, no window.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fakeWav, handWritten, type Written } from "./body.ts";
import { at, type Box } from "./placed.ts";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const tokens = join(root, "body", "tokens.json");
const round = (value: number) => Math.round(value * 2) / 2;
type Drag = { at: number; id: string; dx: number; dy: number; began: boolean };
const inTheTopOf = (strip: Box, card: Box) => strip.x >= card.x - 0.5 && strip.x + strip.w <= card.x + card.w + 0.5 && strip.y >= card.y - 0.5 && strip.y + strip.h <= card.y + card.h / 2 + 0.5;

/**
 * A hand-written run with his drags of the board kept beside it (`drags.jsonl`, as a scripted run writes them). At
 * each moment: how far the board's card is from where it opened, how tall it is against then (it grows downward as
 * rows come), whether its strip lies in the top of the card, and whether the window takes a press there
 * (`paral-headless hits`) in exactly the strip's box.
 */
export function dragged(input: { lines: string[]; rows: Written[]; drags: Drag[]; at: number[] }) {
  const dir = handWritten("dragged", input.rows, input.lines);
  writeFileSync(join(dir, "drags.jsonl"), input.drags.map((drag) => JSON.stringify(drag)).join("\n") + "\n");
  const hits: { does: string; box: Box }[][] = JSON.parse(execFileSync(headless, ["hits", dir, tokens, ...input.at.map(String)], { encoding: "utf8" }));
  let opened: Box | null = null;
  return at(dir, input.at).map(({ placed }, index) => {
    const card = placed.find((item) => item.what === "board")?.box;
    const strip = placed.find((item) => item.what === "strip")?.box;
    if (!card || !strip) return { board: null };
    opened ??= card;
    const takes = hits[index].find((hit) => hit.does === "takes hold of the board")?.box;
    return {
      fromWhereItOpened: [round(card.x - opened.x), round(card.y - opened.y)],
      taller: round(card.h - opened.h),
      stripInTheTopOfTheCard: inTheTopOf(strip, card),
      aPressOnTheStripIsTaken: takes !== undefined && [takes.x - strip.x, takes.y - strip.y, takes.w - strip.w, takes.h - strip.h].every((off) => Math.abs(off) < 0.5),
    };
  });
}

/** How far a drag of a board may go (`Overlay.within`): for each case, the board's box and the drag asked for, on a display 1600 by 1000. */
export function dragWithin(input: { cases: { card: Box; by: [number, number] }[] }) {
  return input.cases.map(({ card, by }) => {
    const held: { dx: number; dy: number } = JSON.parse(execFileSync(headless, ["within", card.x, card.y, card.w, card.h, by[0], by[1], 1600, 1000].map(String), { encoding: "utf8" }));
    return [held.dx, held.dy];
  });
}

/**
 * The whole chain with no network: the headless body plays the steps against the mind on a tape (an ask's words,
 * or a drag step as flow.json writes it), the run is filmed, and the film's record of the last board is read. How
 * far it ended from where it opened; whether it passed through three places or more on the way; whether its rows
 * went on growing after its last move, on the board where he left it; whether no move came more than half a second
 * after the one before it; and whether every row of the record names the strip in the top of the card. Before the
 * run, the folder is given what an earlier run would have left beside its record (a drag far off to one side, and a
 * sight of his pointer): a run that begins takes those away, so only its own are kept.
 */
export function dragOnFilm(input: { lines: string[]; tape: string; steps: (string | { drag: Record<string, unknown> })[] }) {
  const dir = fresh("drag");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  execFileSync(headless, ["page", page, ...input.lines], { encoding: "utf8" });
  const asks = input.steps.map((step, index) => (typeof step === "string" ? (fakeWav(join(dir, `ask-${index + 1}.wav`), step), { wav: join(dir, `ask-${index + 1}.wav`), trail: [], startAfter: "idle" }) : step));
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page, asks }));
  writeFileSync(join(dir, "drags.jsonl"), '{"at":1,"id":"t2","dx":0,"dy":0,"began":true}\n{"at":2,"id":"t2","dx":-555,"dy":333,"began":false}\n');
  writeFileSync(join(dir, "pointer.jsonl"), '{"at":1,"x":5,"y":5}\n');
  const quiet = { cwd: root, encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"] };
  execFileSync("./flow", [join(dir, "flow.json")], { ...quiet, env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  execFileSync("./film", [dir], quiet);
  const drawn = readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { at: number; what: string; id?: string; rows?: number; box: Box });
  const last = drawn.findLast((item) => item.what === "board")?.id ?? "";
  const card = drawn.filter((item) => item.what === "board" && item.id === last);
  const strips = drawn.filter((item) => item.what === "strip" && item.id === `${last}/strip`);
  const moves = card.filter((item, index) => index > 0 && (item.box.x !== card[index - 1].box.x || item.box.y !== card[index - 1].box.y));
  const lastMove = moves.at(-1)?.at ?? -Infinity;
  const told = existsDrags(dir);
  return {
    sightsOfHisPointerLeftFromBefore: existsSync(join(dir, "pointer.jsonl")) ? readFileSync(join(dir, "pointer.jsonl"), "utf8").split("\n").filter(Boolean).length : 0,
    theDragsKeptBesideTheRecord: { presses: told.filter((drag) => drag.began).length, lastOffset: told.at(-1) ? [told.at(-1)!.dx, told.at(-1)!.dy] : null },
    endedFromWhereItOpened: card.length > 0 ? [round(card.at(-1)!.box.x - card[0].box.x), round(card.at(-1)!.box.y - card[0].box.y)] : null,
    passedThroughThreePlacesOrMore: new Set(moves.map((item) => `${item.box.x},${item.box.y}`)).size >= 3,
    noMoveMoreThanHalfASecondAfterTheOneBefore: moves.every((item, index) => index === 0 || item.at - moves[index - 1].at <= 500),
    rowsWentOnGrowingAfterItsLastMove: Math.max(...card.filter((item) => item.at > lastMove).map((item) => item.rows ?? 0)) > (card.findLast((item) => item.at <= lastMove)?.rows ?? 0),
    stripNamedInTheTopOfTheCard: strips.length > 0 && strips.every((strip) => inTheTopOf(strip.box, card.findLast((item) => item.at <= strip.at)?.box ?? card[0].box)),
  };
}

const existsDrags = (dir: string): Drag[] => {
  try {
    return readFileSync(join(dir, "drags.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Drag);
  } catch {
    return [];
  }
};
