// Runners for rows about the Mac side: pages drawn and read back, and whole runs played on a tape and filmed.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { locate, type Box } from "../../mind/cores/ground.ts";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const body = (...args: string[]) => JSON.parse(execFileSync(headless, args, { encoding: "utf8" }));

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (a.w * a.h + b.w * b.h - w * h);
}

type Page = { text: string; quote?: string }[];

export function landing(input: { pages: Page[]; minScore: number; minOverlap: number; byNumber?: boolean }) {
  const dir = fresh("pages");
  mkdirSync(dir, { recursive: true });
  const count = { lines: 0, readRight: 0, quotesMatched: 0, onTarget: 0 };
  const missed: string[] = [];
  input.pages.forEach((page, index) => {
    const picture = join(dir, `page-${index}.png`);
    const truth = body("page", picture, ...page.map((line) => line.text)).lines as { text: string; box: Box }[];
    const read = body("read", picture).lines as { text: string; box: Box }[];
    truth.forEach((line, row) => {
      count.lines++;
      if (read.some((seen) => seen.text === line.text)) count.readRight++;
      const pointed = input.byNumber ? read.findIndex((seen) => overlap(seen.box, line.box) >= input.minOverlap) : -1;
      const found = locate(page[row].quote ?? line.text, read, { scale: 1, x: 0, y: 0 }, input.minScore, pointed >= 0 ? pointed : null);
      const onTarget = found.found && overlap(found.box, line.box) >= input.minOverlap;
      if (found.found) count.quotesMatched++;
      if (onTarget) count.onTarget++;
      else missed.push(page[row].quote ?? line.text);
    });
  });
  return { ...count, missed };
}

function fakeWav(path: string, words: string) {
  const data = Buffer.from(words);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(16000, 24);
  head.writeUInt32LE(32000, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([head, data]));
}

/** A pointer path once around a box, as the flow file wants it: [ms from the key going down, x, y] in display points. */
function around(box: Box, display: { x: number; y: number }): [number, number, number][] {
  return Array.from({ length: 24 }, (_, i) => {
    const turn = (2 * Math.PI * i) / 23;
    return [200 + i * 30, Math.round(display.x + box.x + box.w / 2 + (box.w / 2 + 14) * Math.cos(turn)), Math.round(display.y + box.y + box.h / 2 + (box.h / 2 + 10) * Math.sin(turn))];
  });
}

const session = (dir: string): any[] => readFileSync(join(dir, "session.jsonl"), "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row).line);

/** Whether the film's board began smaller than it ended: an empty card that grew to hold its rows. */
function boardGrew(drawn: any[]): boolean {
  const boards = drawn.filter((item) => item.what === "board");
  return boards.length > 1 && boards.at(-1).box.w > boards[0].box.w;
}

/**
 * How long after his finger lifted the film first shows the thinking look, rounded up to whole frames at 30 a second.
 * The true release is the key-up line's own stamp, carried over to the record's clock by way of the key-down before it.
 */
function thinkingAfterRelease(dir: string, looks: [number, string][]): number {
  const rows = readFileSync(join(dir, "session.jsonl"), "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row));
  const down = rows.find((row) => row.line.type === "key.down");
  const up = rows.find((row) => row.line.type === "key.up");
  const released = down.at + (up.line.at - down.line.at);
  const shown = looks.find(([at, look]) => look === "thinking" && at >= released - 34)?.[0] ?? Infinity;
  return Math.max(0, Math.ceil((shown - released) / (1000 / 30))) * 33;
}

/** A whole run with no network: the headless body plays the asks against the mind on a tape, and the film is read back. */
export function filmed(input: { lines: string[]; display: { x: number; y: number }; tape: string; asks: string[]; onLine: number; drawsAround?: number; still?: boolean; timesTheRelease?: boolean; watchesTheBoard?: boolean }) {
  const dir = fresh("film");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  const truth = body("page", page, ...input.lines).lines as { text: string; box: Box }[];
  const asks = input.asks.map((words, index) => {
    const wav = join(dir, `ask-${index + 1}.wav`);
    fakeWav(wav, words);
    return { wav, trail: input.drawsAround === undefined ? [] : around(truth[input.drawsAround].box, input.display), startAfter: "idle" };
  });
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, ...input.display, w: 1600, h: 1000 }, page, asks }));
  const quiet = { cwd: root, encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as const };
  execFileSync("./flow", [join(dir, "flow.json")], { ...quiet, env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  // `still` films the same run with the reduce-motion token set, through the headless program and its own tokens file.
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  if (input.still !== undefined) writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: input.still } }));
  const made = JSON.parse(input.still === undefined ? execFileSync("./film", [dir], quiet) : execFileSync(headless, ["film", dir, join(dir, "tokens.json")], quiet));
  const drawn = readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const marks = drawn.filter((item) => item.what === "mark");
  const line = truth[input.onLine].box;
  const covers = (mark: Box) => mark.x <= line.x && mark.y <= line.y + line.h / 2 && mark.x + mark.w >= line.x + line.w && mark.y + mark.h >= line.y + line.h / 2;
  return {
    frames: made.frames > 30,
    bareFirstFrame: readdirSync(join(dir, "frames")).includes("f_00000.png"),
    linesSkipped: made.linesSkipped,
    marks: new Set(marks.map((mark) => mark.id)).size,
    markCoversTheLine: marks.length > 0 && covers(marks[0].box),
    capsuleRestsAt: drawn.find((item) => item.what === "capsule").box,
    voiceSeconds: made.voiceSeconds,
    ...(input.watchesTheBoard ? { boardLines: session(dir).filter((line) => line.type === "board").map((line) => line.rows.length), cardGrew: boardGrew(drawn) } : {}),
    ...(input.timesTheRelease ? { thinkingLookAfterTheTrueReleaseMs: thinkingAfterRelease(dir, made.looks) } : {}),
    ...(input.still === undefined ? {} : { aPointerFlies: drawn.some((item) => item.what === "pointer") }),
    ...(input.drawsAround === undefined
      ? {}
      : {
          trailDrawn: drawn.some((item) => item.what === "trail"),
          hisLoopComesBackAsARing: drawn.some((item) => item.what === "echo"),
          pathOnThePicture: !readFileSync(join(dir, "page-with-his-path.jpg")).equals(readFileSync(join(dir, "page-for-the-brain.jpg"))),
          wordsTheMindWasGiven: session(dir).findLast((line) => line.type === "screen").lines.map((line: { text: string }) => (line.text === "" ? "(no words)" : line.text)),
          said: session(dir).filter((line) => line.type === "say" && line.beat >= 0).map((line) => line.text),
        }),
  };
}

/**
 * What the capsule shows at given moments of a hand-written run: each line with the time it arrived. No mind and no
 * service; the same scene the real window and the films use.
 */
export function capsule(input: { rows: { at: number; line: Record<string, unknown> }[]; at: number[] }) {
  const dir = fresh("capsule");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  body("page", page, "a page");
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page, asks: [] }));
  writeFileSync(join(dir, "session.jsonl"), input.rows.map((row) => JSON.stringify({ at: row.at, line: { v: 1, ...row.line } })).join("\n") + "\n");
  return body("capsule", dir, join(root, "body", "tokens.json"), ...input.at.map(String));
}
