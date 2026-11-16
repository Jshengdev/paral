// The runner for rows about a note paral's pointer writes on a board: moments of a hand-written run, what a film's
// record says of the writing, and the whole chain on a tape, filmed. No service, no window.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fakeWav, handWritten, type Written } from "./body.ts";
import { sounded } from "./pill.ts";
import { at, type Box } from "./placed.ts";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const tokens = join(root, "body", "tokens.json");
const round = (value: number) => Math.round(value * 2) / 2;
type Row = { at: number; what: string; id?: string; says?: string | null; box: Box };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const inside = (a: Box, b: Box) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
// The pointer is at the end of the writing when its middle is within its own width of the middle of the note's right edge.
const atTheEnd = (pointer: Box, note: Box) => Math.hypot(pointer.x + pointer.w / 2 - (note.x + note.w), pointer.y + pointer.h / 2 - (note.y + note.h / 2)) <= pointer.w;

/**
 * A hand-written run with a note on its board. At each moment: what of the note is written so far (null: nothing
 * yet); whether paral's pointer is at the end of the writing; whether the note is inside the card and over none of
 * the board's named boxes; where it stands (beside a box, right of it and level with it, or under so many of the
 * boxes drawn and above the rest); and the card's size, which keeps room for the whole note from the start.
 */
export function noted(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("noted", sounded(input.rows), input.lines);
  return at(dir, input.at).map(({ placed }) => {
    const card = placed.find((item) => item.what === "board")?.box;
    if (!card) return { board: null };
    const note = placed.find((item) => item.what === "note");
    const boxes = placed.filter((item) => item.what === "box").map((item) => item.box);
    const pointer = placed.find((item) => item.what === "pointer")?.box;
    const size = [round(card.w), round(card.h)];
    if (!note) return { note: null, card: size };
    const beside = boxes.find((box) => note.box.x >= box.x + box.w && note.box.y + note.box.h / 2 > box.y && note.box.y + note.box.h / 2 < box.y + box.h);
    const above = boxes.filter((box) => box.y + box.h <= note.box.y + 0.5).length, below = boxes.filter((box) => box.y >= note.box.y + note.box.h - 0.5).length;
    return {
      note: note.says,
      pointerAtTheEndOfTheWriting: pointer ? atTheEnd(pointer, note.box) : false,
      insideTheCard: inside(note.box, card),
      overNoBox: boxes.every((box) => overlap(note.box, box) === 0),
      stands: beside ? "beside a box" : `under ${above} of the ${boxes.length} boxes drawn, above ${below}`,
      card: size,
    };
  });
}

/** What a film's record says of the writing, read as a reader of the film would: how the note's rows grow, how fast, and where the pointer is each time. */
function written(drawn: Row[]) {
  const notes = drawn.filter((item) => item.what === "note");
  const ids = [...new Set(notes.map((item) => item.id))];
  return ids.map((id) => {
    const grown = notes.filter((item) => item.id === id), last = grown.at(-1)!;
    const letters = (last.says ?? "").replace(/\s/g, "").length, seconds = (last.at - grown[0].at) / 1000;
    const card = drawn.findLast((item) => item.what === "board" && id!.startsWith(`${item.id}/`))?.box;
    const boxes = [...new Map(drawn.filter((item) => item.what === "box").map((item) => [item.id, item.box])).values()];
    return {
      id: id!.replace(/^[^/]+/, "<board>"),
      says: last.says,
      cameInThreePiecesOrMore: grown.length >= 3,
      eachPieceLongerThanTheLast: grown.every((item, index) => index === 0 || (item.says ?? "").length > (grown[index - 1].says ?? "").length),
      sixLettersASecondOrFewer: seconds > 0 && letters / seconds <= 6.5,
      pointerAtTheEndEachTimeItGrows: grown.every((item) => {
        const pointer = drawn.filter((other) => other.what === "pointer" && other.at <= item.at).at(-1)?.box;
        return pointer !== undefined && atTheEnd(pointer, item.box);
      }),
      insideTheCard: card !== undefined && inside(last.box, card),
      overNoBox: boxes.every((box) => overlap(last.box, box) === 0),
      boxesNamed: boxes.length,
    };
  });
}

/** A hand-written run, filmed: what the film's record says of each note on its board (`written`). */
export function notedRecord(input: { lines: string[]; rows: Written[] }) {
  const dir = handWritten("noted-record", sounded(input.rows), input.lines);
  execFileSync(headless, ["film", dir, tokens], { encoding: "utf8" });
  return written(readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row));
}

/**
 * The whole chain with no network: the headless body plays the asks against the mind on a tape, the run is filmed,
 * and the record is read. The board lines of the last ask as the mind sent them (rows, shape, and each note with
 * whether it had its sentence by then), and what the film's record says of the writing.
 */
export function notesOnFilm(input: { lines: string[]; tape: string; asks: string[] }) {
  const dir = fresh("notes");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  execFileSync(headless, ["page", page, ...input.lines], { encoding: "utf8" });
  const asks = input.asks.map((words, index) => (fakeWav(join(dir, `ask-${index + 1}.wav`), words), { wav: join(dir, `ask-${index + 1}.wav`), trail: [], startAfter: "idle" }));
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page, asks }));
  const quiet = { cwd: root, encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"] };
  execFileSync("./flow", [join(dir, "flow.json")], { ...quiet, env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  execFileSync("./film", [dir], quiet);
  const lines = readFileSync(join(dir, "session.jsonl"), "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row).line as { type: string; id?: string; shape?: string; rows?: string[][]; beats?: number[]; notes?: { row: number; says: string; beat?: number }[] });
  const last = lines.findLast((line) => line.type === "board")?.id ?? "";
  return {
    boardLinesOfTheLastAsk: lines.filter((line) => line.type === "board" && line.id === last).map((line) => ({ rows: line.rows?.length ?? 0, shape: line.shape ?? null, rowsWithASentence: line.beats?.length ?? null, notes: (line.notes ?? []).map((note) => `row ${note.row}: "${note.says}"${note.beat === undefined ? ", not yet" : ", with its sentence"}`) })),
    theFilmsRecord: written(readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row)),
  };
}
