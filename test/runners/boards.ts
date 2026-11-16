// The runner for rows about what a film's record says of a board: a hand-written run, filmed. No mind, no service.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fakeWav, handWritten, type Written } from "./body.ts";
import { firstParts, grow, wholeRows, type Growing } from "../../mind/cores/board.ts";
import type { Limits } from "../../mind/cores/beats.ts";
import { fresh } from "./temp.ts";

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

/**
 * What the film's record says of a growing board: for each number of rows drawn, when the record first says so, and
 * whether that is once that row's own sentence has begun (`begins`, by row from 1) and before the next row's has;
 * and whether a board that does not grow writes any such number.
 */
export function boardRows(input: { lines: string[]; rows: Written[]; begins: Record<string, number>; plain: Written[] }) {
  const tokens = join(root, "body", "tokens.json");
  const record = (name: string, rows: Written[]) => {
    const dir = handWritten(name, rows, input.lines);
    execFileSync(headless, ["film", dir, tokens], { encoding: "utf8" });
    return readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { at: number; what: string; rows?: number }).filter((item) => item.what === "board");
  };
  const grew = record("board-rows", input.rows);
  const first = new Map<number, number>();
  for (const item of grew) if (item.rows !== undefined && !first.has(item.rows)) first.set(item.rows, item.at);
  return {
    rowsInOrder: [...first.keys()],
    eachWithItsOwnSentence: [...first].map(([rows, at]) => at >= input.begins[String(rows)] && (input.begins[String(rows + 1)] === undefined || at < input.begins[String(rows + 1)])),
    aBoardThatDoesNotGrowSaysNoRows: record("board-plain", input.plain).every((item) => item.rows === undefined),
  };
}

/**
 * The whole chain for a board that grows with its answer, with no network: the headless body plays the asks against
 * the mind on a tape, the run is filmed, and the film's record is set against when each sentence was voiced. For the
 * last ask: how many sentences it had, how many rows the record ends on, whether the card was up before its first
 * sentence began, and for each row whether it came once its own sentence had begun and before that sentence ended
 * (to a frame, 34 ms). For the asks before it: whether their boards came whole, with no row count in the record.
 */
export function wholeOnFilm(input: { lines: string[]; tape: string; asks: string[] }) {
  const dir = fresh("whole");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  execFileSync(headless, ["page", page, ...input.lines], { encoding: "utf8" });
  const asks = input.asks.map((words, index) => (fakeWav(join(dir, `ask-${index + 1}.wav`), words), { wav: join(dir, `ask-${index + 1}.wav`), trail: [], startAfter: "idle" }));
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page, asks }));
  const quiet = { cwd: root, encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"] };
  execFileSync("./flow", [join(dir, "flow.json")], { ...quiet, env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  execFileSync("./film", [dir], quiet);
  const rows = readFileSync(join(dir, "session.jsonl"), "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row) as { at: number; line: any });
  const drawn = readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as { at: number; what: string; id?: string; rows?: number });
  const last = rows.findLast((row) => row.line.type === "say")!.line.id as string;
  // When each sentence of the last ask is voiced, as the scene works it out: its sound's first arrival, or the end of the one before.
  const voiced = new Map<number, { start: number; end: number }>();
  let cursor = -Infinity;
  for (const beat of [...new Set(rows.filter((row) => row.line.type === "say" && row.line.id === last).map((row) => row.line.beat as number))].sort((a, b) => a - b)) {
    const sound = rows.filter((row) => row.line.type === "voice" && row.line.id === last && row.line.beat === beat && row.line.pcm !== "");
    if (sound.length === 0) break;
    const start = Math.max(sound[0].at, cursor);
    cursor = start + sound.reduce((bytes, row) => bytes + Buffer.from(row.line.pcm, "base64").length, 0) / 48;
    voiced.set(beat, { start, end: cursor });
  }
  const own = [...voiced].filter(([beat]) => beat >= 0).map(([, times]) => times);
  const cards = drawn.filter((item) => item.what === "board");
  const grew = cards.filter((item) => item.id === last);
  const came = (row: number) => grew.find((item) => (item.rows ?? 0) >= row)?.at;
  return {
    sentences: own.length,
    rowsAtTheEnd: grew.at(-1)?.rows ?? null,
    boardLinesWithBeats: rows.filter((row) => row.line.type === "board" && row.line.id === last).map((row) => row.line.beats?.length ?? null),
    theCardIsNotUpBeforeItsFirstSentence: grew.length > 0 && grew[0].at >= own[0].start - 34,
    eachRow: own.map((times, index) => ({ row: index + 1, cameOnceItsSentenceHadBegun: (came(index + 1) ?? -Infinity) >= times.start - 34, andBeforeItEnded: (came(index + 1) ?? Infinity) <= times.end })),
    boardsOfTheAsksBeforeCameWhole: cards.filter((item) => item.id !== last).every((item) => item.rows === undefined) && cards.some((item) => item.id !== last),
  };
}

/** A growing board's decisions with no body: how many rows the written board is cut to, where each written sentence starts among the spoken ones, and the rows' beats after each spoken sentence (`said`: its beat, or null when it was held back). */
export function boardGrows(input: { board: string[][]; most: number; rows: number; says: string[]; limits: Limits; said: (number | null)[] }) {
  const firsts = firstParts(input.says, input.limits);
  let now: Growing = { beats: [], stopped: false };
  const after = input.said.map((beat, place) => [...(now = grow(now, input.rows, firsts, place, beat)).beats]);
  return { rows: wholeRows(input.board, input.most).length, firsts, after, stopped: now.stopped };
}

type Item = { what: string; id?: string; shape?: string; box: { x: number; y: number; w: number; h: number } };
const near = (a: number, b: number) => Math.abs(a - b) < 0.75;

/**
 * A column on a hand-written run, at one moment, as the painter says it drew it: its shape, its boxes and the arrows
 * that join them, and whether the boxes stand one under another with one width and one middle, each arrow in the gap
 * between its two boxes and on that middle, all of it inside the card, and the card taller than it is wide. Then
 * what the film's record says of it (the shape on every row of the board, and how its words' size stands to the
 * tokens'), and of the same boxes sent with no shape (`plain`): no shape, and no box or arrow named.
 */
export function boardColumn(input: { lines: string[]; rows: Written[]; plain: Written[]; at: number }) {
  const tokens = join(root, "body", "tokens.json");
  const dir = handWritten("board-column", input.rows, input.lines);
  const placed = (JSON.parse(execFileSync(headless, ["placed", dir, tokens, String(input.at)], { encoding: "utf8" })) as { placed: Item[] }[])[0].placed;
  const card = placed.find((item) => item.what === "board");
  const boxes = placed.filter((item) => item.what === "box").map((item) => item.box);
  const joins = placed.filter((item) => item.what === "join").map((item) => item.box);
  const middle = (box: Item["box"]) => box.x + box.w / 2;
  const filmed = (from: string) => (execFileSync(headless, ["film", from, tokens], { encoding: "utf8" }), readFileSync(join(from, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Item & { type?: number }));
  const record = filmed(dir), ordinary = filmed(handWritten("board-column-plain", input.plain, input.lines));
  const asked: number = JSON.parse(readFileSync(tokens, "utf8")).board.type;
  return {
    shape: card?.shape ?? null,
    boxes: boxes.length,
    arrows: joins.length,
    oneUnderAnother: boxes.every((box, index) => index === 0 || box.y >= boxes[index - 1].y + boxes[index - 1].h),
    oneWidthAndOneMiddle: boxes.every((box) => near(box.w, boxes[0].w) && near(middle(box), middle(boxes[0]))),
    eachArrowBetweenItsTwoBoxesOnTheMiddle: joins.every((arrow, index) => arrow.y >= boxes[index].y + boxes[index].h && arrow.y + arrow.h <= boxes[index + 1].y && near(middle(arrow), middle(boxes[0]))),
    insideTheCard: card !== undefined && [...boxes, ...joins].every((box) => box.x >= card.box.x && box.y >= card.box.y && box.x + box.w <= card.box.x + card.box.w && box.y + box.h <= card.box.y + card.box.h),
    cardTallerThanWide: card !== undefined && card.box.h > card.box.w,
    record: { shapeOnEveryRowOfTheBoard: [...new Set(record.filter((item) => item.what === "board").map((item) => item.shape ?? null))], words: record.filter((item) => item.what === "board").every((item) => item.type === asked) ? "at the tokens' size" : "not at the tokens' size" },
    sentWithNoShape: { shape: [...new Set(ordinary.filter((item) => item.what === "board").map((item) => item.shape ?? null))], boxesOrArrowsNamed: ordinary.filter((item) => item.what === "box" || item.what === "join").length },
  };
}

/**
 * The whole chain for a column, with no network: the headless body plays the asks against the mind on a tape, the
 * run is filmed, and the record is read. For the last ask: the board lines the mind sent (their shape and rows), what
 * shape the film's record names on its board, how many boxes and arrows it names, and whether every box was there in
 * the first frame the card was. For the asks before it: the shapes the record names on their boards.
 */
export function columnOnFilm(input: { lines: string[]; tape: string; asks: string[] }) {
  const dir = fresh("column");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  execFileSync(headless, ["page", page, ...input.lines], { encoding: "utf8" });
  const asks = input.asks.map((words, index) => (fakeWav(join(dir, `ask-${index + 1}.wav`), words), { wav: join(dir, `ask-${index + 1}.wav`), trail: [], startAfter: "idle" }));
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page, asks }));
  const quiet = { cwd: root, encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"] };
  execFileSync("./flow", [join(dir, "flow.json")], { ...quiet, env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  execFileSync("./film", [dir], quiet);
  const lines = readFileSync(join(dir, "session.jsonl"), "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row).line as { type: string; id?: string; shape?: string; rows?: string[][] });
  const drawn = readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Item & { at: number });
  const last = lines.findLast((line) => line.type === "board")?.id ?? "";
  const mine = (item: { id?: string }) => item.id === last || (item.id ?? "").startsWith(`${last}/`);
  const cardUp = drawn.find((item) => item.what === "board" && mine(item))?.at ?? null;
  const named = (what: string) => drawn.filter((item) => item.what === what && mine(item));
  return {
    boardLinesOfTheLastAsk: lines.filter((line) => line.type === "board" && line.id === last).map((line) => ({ shape: line.shape ?? null, rows: line.rows?.length ?? 0, boxesInARow: [...new Set(line.rows?.map((row) => row.length))] })),
    theRecordNamesOnItsBoard: [...new Set(named("board").map((item) => item.shape ?? null))],
    boxes: new Set(named("box").map((item) => item.id)).size,
    arrows: new Set(named("join").map((item) => item.id)).size,
    everyBoxWasThereInTheCardsFirstFrame: cardUp !== null && named("box").length > 0 && new Set(named("box").filter((item) => item.at === cardUp).map((item) => item.id)).size === new Set(named("box").map((item) => item.id)).size,
    shapesOnTheBoardsOfTheAsksBefore: [...new Set(drawn.filter((item) => item.what === "board" && !mine(item)).map((item) => item.shape ?? null))],
  };
}
