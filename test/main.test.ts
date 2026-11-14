import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { anthropic } from "../mind/adapters/anthropic.ts";
import { tape } from "../mind/adapters/tape.ts";
import { serve } from "../mind/server.ts";
import { boxes, fitted, givesAway, split, wipes } from "../mind/cores/beats.ts";
import { asksForDrawing, fits, hear, silence } from "../mind/cores/catch.ts";
import { showable, unfit } from "../mind/cores/fit.ts";
import { circled, echo } from "../mind/cores/circle.ts";
import { happened } from "../mind/cores/happened.ts";
import { settled } from "../mind/cores/partial.ts";
import { locate, type Box } from "../mind/cores/ground.ts";
import { pick, seconds } from "../mind/cores/lesson.ts";
import { next, type Happened } from "../mind/cores/teach.ts";
import { judge, type Judged } from "../mind/cores/push.ts";
import { empty, fold, NO_RUNG } from "../mind/cores/hold.ts";
import { FromBody, FromMind, read, write } from "../seam/schema.ts";
import { settings } from "../mind/settings.ts";

type Row = { name: string; run: string; in: any; out: unknown };
type Filed = Row & { file: string };

let sockets = 0;

const headless = join(import.meta.dirname, "..", "body", ".build", "debug", "paral-headless");
const body = (...args: string[]) => JSON.parse(execFileSync(headless, args, { encoding: "utf8" }));

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (a.w * a.h + b.w * b.h - w * h);
}

type Page = { text: string; quote?: string }[];

function landing(input: { pages: Page[]; minScore: number; minOverlap: number; byNumber?: boolean }) {
  const dir = join(tmpdir(), `paral-pages-${process.pid}`);
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

const root = join(import.meta.dirname, "..");

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
function filmed(input: { lines: string[]; display: { x: number; y: number }; tape: string; asks: string[]; onLine: number; drawsAround?: number; still?: boolean; timesTheRelease?: boolean; watchesTheBoard?: boolean }) {
  const dir = join(tmpdir(), `paral-film-${process.pid}-${++sockets}`);
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
          said: session(dir).filter((line) => line.type === "say" && line.beat >= 0).map((line) => line.text),
        }),
  };
}

type Step = { until?: string; release?: boolean | string; say?: string } & Record<string, unknown>;

const shorter = (line: any) =>
  line.type === "voice"
    ? { v: line.v, type: line.type, id: line.id, beat: line.beat, bytes: Buffer.from(line.pcm, "base64").length, ...(line.last ? { last: true } : {}) }
    : line.type === "words"
      ? { v: line.v, type: line.type, id: line.id, beat: line.beat, count: line.words.length, ends: Number(line.end.at(-1).toFixed(2)) }
      : line;

async function playTurn(input: { tape: string; asks: Step[][]; set?: Record<string, unknown>; show?: "drawn" }): Promise<unknown> {
  const path = join(tmpdir(), `paral-row-${process.pid}-${++sockets}.sock`);
  const played = tape(join(import.meta.dirname, "tapes", input.tape));
  const changed: any = { ...settings };
  for (const [name, value] of Object.entries(input.set ?? {})) changed[name] = { ...changed[name], value };
  const server = await serve(path, played, changed, () => {});
  const socket = connect(path);
  const got: any[] = [];
  let pending = "";
  let cursor = 0;
  let waiting: { ok: (line: any) => boolean; done: () => void } | null = null;
  const scan = () => {
    while (waiting && cursor < got.length) {
      if (waiting.ok(got[cursor++])) {
        const { done } = waiting;
        waiting = null;
        done();
      }
    }
  };
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    pending += chunk;
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const text of lines) got.push(JSON.parse(text));
    scan();
  });
  const until = (ok: (line: any) => boolean, what: string) =>
    new Promise<void>((resolve, reject) => {
      const guard = setTimeout(() => reject(new Error(`the mind never sent ${what}`)), 5000);
      waiting = { ok, done: () => (clearTimeout(guard), resolve()) };
      scan();
    });
  const settled = (line: any) => line.type === "ready" || (line.type === "state" && ["idle", "failed"].includes(line.name));
  try {
    for (const ask of input.asks) {
      for (const step of ask) {
        if (step.until) await until((line) => line.type === step.until, `a "${step.until}" line`);
        else if (step.release) played.release(typeof step.release === "string" ? step.release : undefined);
        else if (step.say) socket.write(JSON.stringify({ v: 1, type: "mic", pcm: Buffer.from(step.say).toString("base64"), at: 0 }) + "\n");
        else socket.write(JSON.stringify(step) + "\n");
      }
      await until(settled, "a settled state");
    }
    if (input.show === "drawn") return played.asked.map((asked) => ({ words: asked.words, drawn: asked.lesson.drawn }));
    return got.map(shorter);
  } finally {
    socket.destroy();
    await server.stop();
  }
}

async function standIn(input: { asked: any; picture: boolean; brainReply: any; lookReply: any; capUsd?: number; asks?: number; board?: string[][] }) {
  const calls: unknown[] = [];
  const seen = (kind: string, params: any, options: any) => {
    const content = params.messages[0].content;
    const text = typeof content === "string" ? content : content.find((block: any) => block.type === "text").text;
    calls.push({
      kind,
      model: params.model,
      effort: params.output_config.effort,
      structured: params.output_config.format?.type ?? null,
      fallbacks: params.fallbacks ?? null,
      picture: Array.isArray(content) && content.some((block: any) => block.type === "image"),
      signal: options?.signal instanceof AbortSignal,
      numbered: text.includes("1: 2x + 6 = 14, so x = 10"),
      namesRung: text.includes("Write the hint for this rung: look."),
      ...(input.asked.circled ? { namesWhatHeDrewAround: text.includes(`drew around lines ${input.asked.circled.join(", ")}`) } : {}),
      ...(input.asked.lesson?.drawn ? { namesWhatIsDrawn: text.includes(`still on their screen: ${input.asked.lesson.drawn.join("; ")}`) } : {}),
    });
  };
  const streamed = (params: any, options: any) => {
    seen("brain", params, options);
    // Written in the order the model writes in: the board before the sentences.
    const { beats = [], ...head } = input.brainReply.parsed_output ?? {};
    const text = input.brainReply.parsed_output ? JSON.stringify({ lesson: null, ...head, board: input.board ?? null, beats }) : "";
    const hearers: ((delta: string, soFar: string) => void)[] = [];
    return {
      on: (_event: string, hearer: (delta: string, soFar: string) => void) => hearers.push(hearer),
      async finalMessage() {
        const pieces = input.board ? Array.from({ length: 50 }, (_, i) => (i + 1) / 50) : [0.3, 0.6, 0.9, 1];
        for (const share of pieces) for (const hearer of hearers) hearer("", text.slice(0, Math.round(text.length * share)));
        return { ...input.brainReply, content: text ? [{ type: "text", text }] : [] };
      },
    };
  };
  const client: any = {
    beta: { messages: { stream: streamed } },
    messages: { parse: async (params: any, options: any) => (seen("look", params, options), input.lookReply) },
  };
  const picturePath = join(tmpdir(), `paral-stand-in-${process.pid}.jpg`);
  if (input.picture) writeFileSync(picturePath, "not a real picture");
  const capped = { ...settings, spendCapUsd: { ...settings.spendCapUsd, value: input.capUsd ?? settings.spendCapUsd.value } };
  const logged: string[] = [];
  const live = anthropic(client, capped, { answer: "answer prompt", secondLook: "second look prompt", opener: "opener prompt" }, (line) => logged.push(line));
  const signal = new AbortController().signal;
  const asked = { circled: [], leadIn: null, lessons: [], ...input.asked, lesson: { ...empty, ...input.asked.lesson }, picturePath: input.picture ? picturePath : null, rung: settings.ladder.value[0] };
  try {
    let answered = null;
    let early = false;
    const boards = new Set<string>();
    for (let ask = 0; ask < (input.asks ?? 1); ask++) {
      answered = await live.brain.answer(asked, signal, (part) => {
        early ||= part.breakLine !== undefined && !part.whole;
        if (part.board !== undefined) boards.add(JSON.stringify(part.board));
      });
    }
    if (input.board) return { boardsGivenWhileItArrived: [...boards].map((board) => JSON.parse(board)), boardAtTheEnd: answered!.board };
    const leaks = await live.secondLook.leaks(answered!.beats[0].say, answered!.problem, signal);
    return { answered, leaks, calls, spentUsd: Number(live.spentUsd().toFixed(6)), toldTheLineEarly: early };
  } catch (error) {
    return { failed: (error as Error).message, calls: calls.length, theLogKeepsTheReply: logged.some((line) => line.includes("It wrote:")) };
  }
}

const runs: Record<string, (input: any) => unknown> = {
  "live.standin": standIn,
  "beats.fitted": (input) => Object.fromEntries(Object.entries(input.marks).map(([name, [kind, text]]: [string, any]) => [name, fitted(kind, text, input.lines, input.reach, input.scale)])),
  "beats.split": (input) => Object.fromEntries(Object.entries(input.sentences).map(([name, text]) => [name, split(text as string, input.limits)])),
  fit: (input) => Object.fromEntries(input.lines.map((line: string) => [line, unfit(line)])),
  "fit.showable": (input) => Object.fromEntries(input.messages.map((message: string) => [message.slice(0, 60), showable(message)])),
  "beats.boxes": (input) => Object.fromEntries(Object.entries(input.boards).map(([name, rows]) => [name, boxes(rows as string[][])])),
  "beats.givesAway": (input) => givesAway(input.planned, input.result),
  partial: (input) => Object.fromEntries(Object.entries(input.cases).map(([name, text]) => [name, settled(text as string)])),
  "beats.wipes": (input) => input.cases.map(([fresh, last, now]: [boolean, string | null, string | null]) => wipes(fresh, last, now)),
  prompts: () =>
    Object.fromEntries(
      ["answer", "second-look", "opener"].map((name) => [
        name,
        createHash("sha256").update(readFileSync(join(import.meta.dirname, "..", "mind", "prompts", `${name}.md`))).digest("hex").slice(0, 12),
      ]),
    ),
  turn: playTurn,
  "body.landing": landing,
  "body.filmed": filmed,
  catch: (input) => input.events.reduce(hear, silence),
  "catch.drawing": (input) => Object.fromEntries(input.asks.map((words: string) => [words, asksForDrawing(words, input.phrases)])),
  "catch.fits": (input) => input.cases.map(([drafted, final]: [string, string]) => fits(drafted, final, input.share)),
  circle: (input) =>
    Object.fromEntries(
      Object.entries(input.trails).map(([name, trail]: [string, any]) => [
        name,
        {
          lines: circled(trail, input.lines, input.display, input.least),
          comesBackAs: echo(trail, { lines: input.lines, display: input.display }, input.least),
          beforeThePageIsRead: echo(trail, null, input.least)?.shape ?? null,
        },
      ]),
    ),
  lesson: (input) => ({
    shown: Object.fromEntries(Object.entries(input.cases).map(([name, on]: [string, any]) => [name, pick(input.examples, on.lines, on.result)?.left ?? null])),
    seconds: Object.fromEntries(Object.entries(input.mp4).map(([name, hex]) => [name, seconds(Buffer.from(hex as string, "hex"))])),
  }),
  ground: (input) => locate(input.quoted, input.lines, input.display, input.minScore, input.index ?? null),
  teach: (input) => {
    let rung = NO_RUNG;
    return input.happened.map((what: Happened) => {
      const move = next(rung, what, input.rungs);
      rung = move.rung;
      return move;
    });
  },
  happened: (input) => happened(input.seen, input.justTellMe, input.sameLineScore),
  stop: async (input) => {
    const path = join(tmpdir(), `paral-row-${process.pid}-${++sockets}.sock`);
    const mind = await serve(path, tape(join(import.meta.dirname, "tapes", input.tape)), settings, () => {});
    const socket = connect(path);
    await new Promise((resolve) => socket.once("connect", resolve));
    const closed = new Promise<boolean>((resolve) => socket.once("close", () => resolve(true)));
    const began = Date.now();
    await mind.stop();
    return { bodySawTheEnd: await closed, insideTheLimit: Date.now() - began < settings.stopLimitMs.value };
  },
  push: (input) => judge(input),
  "push.count": (input) => {
    const verdicts = input.lines.map((line: Judged & { leaks: boolean }) => ({ leaks: line.leaks, caught: judge(line).verdict === "leak" }));
    return {
      leaking: verdicts.filter((v: any) => v.leaks).length,
      caught: verdicts.filter((v: any) => v.leaks && v.caught).length,
      falseAlarms: verdicts.filter((v: any) => !v.leaks && v.caught).length,
    };
  },
  hold: (input) => input.events.reduce(fold, empty),
  "hold.drawn": (input) => {
    let lesson = empty;
    return input.events.map((event: any) => (lesson = fold(lesson, event)).drawn);
  },
  "seam.read": (input) => read(input.from === "body" ? FromBody : FromMind, input.text),
  "seam.write": (input) => write(input.from === "body" ? FromBody : FromMind, input.line),
  size: (input) => {
    const long = (path: string) => readFileSync(path, "utf8").split("\n").length;
    const files = input.folders.flatMap((folder: string) =>
      (readdirSync(join(root, folder), { recursive: true }) as string[]).filter((file) => /\.(ts|swift)$/.test(file)).map((file) => join(folder, file)),
    );
    return { tooLong: files.filter((file: string) => long(join(root, file)) > input.limit), testFileFits: long(import.meta.filename) <= input.testLimit };
  },
  settings: () => Object.entries(settings).filter(([, s]) => !s.why.trim() || !s.measured.trim()).map(([name]) => name),
};

const dir = join(import.meta.dirname, "rows");
const only = process.env.ROWS ?? "";
const rows: Filed[] = readdirSync(dir)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => ({ ...JSON.parse(readFileSync(join(dir, file), "utf8")), file }));

const chosen = rows.filter((row) => row.name.includes(only));
if (chosen.length === 0) test(`no row's name contains "${only}"`, () => assert.fail("the filter matched nothing, so nothing was checked"));

for (const row of chosen) {
  test(row.name, async () => {
    const run = runs[row.run];
    assert.ok(run, `no runner called "${row.run}"`);
    const did = JSON.parse(JSON.stringify(await run(row.in)));
    // SHOW=1 prints what the row did, one item a line, for reading.
    if (process.env.SHOW === "1") console.log(`--- ${row.file}\n${(Array.isArray(did) ? did : [did]).map((item) => JSON.stringify(item)).join("\n")}`);
    // FREEZE=1 fills in a new row whose "out" is null with what happened, and fails so that it is read before it is trusted.
    if (process.env.FREEZE === "1" && row.out === null) {
      const { file, ...kept } = row;
      writeFileSync(join(dir, file), JSON.stringify({ ...kept, out: did }, null, 1) + "\n");
      assert.fail(`wrote what happened into ${file}; read it before trusting it`);
    }
    assert.deepEqual(did, row.out);
  });
}
