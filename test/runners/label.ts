// The runner for rows about the small label under the open pill: what it says and where it stands at moments of a
// hand-written run, what a film's record says of it, and the whole chain on a tape. No service, no window.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fakeWav, handWritten, type Written } from "./body.ts";
import { sounded } from "./pill.ts";
import { at, DISPLAY } from "./placed.ts";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const round = (value: number) => Math.round(value * 2) / 2;
// The mind's first line, which names the key the run was started with. A run with none is one whose mind never linked.
const started = (key: string | null): Written[] => (key === null ? [] : [{ at: 0, line: { type: "ready", holdKey: key, earGraceMs: 300, markPad: 4, pictureLongEdge: 1280 } }]);
type Row = { at: number; what: string; look?: string; says?: string | null; box?: unknown };
const record = (dir: string) => readFileSync(join(dir, "drawn.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row);

/**
 * One hand-written run, started on each of `keys` in turn (null: its record has no `ready` line). For the first key,
 * at each moment: the capsule's look and the label (what it says, how far under the pill and above the floor it
 * stands, whether its middle is the pill's, how tall it is, and whether that is at most half the pill). For every
 * key: what the label says at each moment, null where there is none.
 */
export function label(input: { rows: Written[]; at: number[]; keys: (string | null)[] }) {
  const seen = input.keys.map((key) => at(handWritten("label", sounded([...started(key), ...input.rows])), input.at));
  const first = seen[0].map(({ placed, capsule }) => {
    const pill = placed.find((item) => item.what === "capsule")!.box;
    const chip = placed.find((item) => item.what === "label");
    if (!chip) return { look: capsule.look, label: null };
    const middle = round(chip.box.x + chip.box.w / 2) === round(pill.x + pill.w / 2) ? "the pill's" : round(chip.box.x + chip.box.w / 2);
    return { look: capsule.look, label: { says: chip.says, underThePill: round(chip.box.y - (pill.y + pill.h)), aboveTheFloor: round(DISPLAY.h - (chip.box.y + chip.box.h)), middle, tall: round(chip.box.h), atMostHalfThePill: chip.box.h <= pill.h / 2 } };
  });
  return { first, says: Object.fromEntries(input.keys.map((key, index) => [key ?? "no ready line", seen[index].map(({ placed }) => placed.find((item) => item.what === "label")?.says ?? null)])) };
}

/**
 * What a film's record says of the label in a hand-written run started on `key`: each of its rows in order (when,
 * and its words, null for the row that says it is gone), and whether every one of them carries a box.
 */
export function labelRecord(input: { rows: Written[]; key: string }) {
  const dir = handWritten("label-record", sounded([...started(input.key), ...input.rows]));
  execFileSync(headless, ["film", dir, join(root, "body", "tokens.json")], { encoding: "utf8" });
  const rows = record(dir).filter((item) => item.what === "label");
  return { rows: rows.map((item) => ({ at: item.at, says: item.says ?? null })), everyRowHasABox: rows.every((item) => item.box !== undefined) };
}

/**
 * The whole chain with no network: the headless body plays asks made with the key against the mind on a tape, the
 * run is filmed, and the film's record is read. Gives the key the mind's own `ready` line names; everything the
 * label said in the very frame the capsule took each of three looks (null: no label); and whether no label stood
 * while he talked. How often each look comes, and whether a hold this short is filmed at all, is a matter of timing,
 * so only what holds whatever the timing is given back.
 */
export function labelOnFilm(input: { lines: string[]; tape: string; asks: string[] }) {
  const dir = fresh("label-film");
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "page.png");
  execFileSync(headless, ["page", page, ...input.lines], { encoding: "utf8" });
  const asks = input.asks.map((words, index) => (fakeWav(join(dir, `ask-${index + 1}.wav`), words), { wav: join(dir, `ask-${index + 1}.wav`), trail: [], startAfter: "idle" }));
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { id: 2, scale: 1, x: 0, y: 0, w: 1600, h: 1000 }, page, asks }));
  const quiet = { cwd: root, encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"] };
  execFileSync("./flow", [join(dir, "flow.json")], { ...quiet, env: { ...process.env, PARAL_TAPE: join(root, "test", "tapes", input.tape) } });
  execFileSync("./film", [dir], quiet);
  const ready = readFileSync(join(dir, "session.jsonl"), "utf8").split("\n").filter(Boolean).map((row) => JSON.parse(row).line).find((line) => line.type === "ready");
  const rows = record(dir);
  const looks = rows.filter((item, index) => item.what === "capsule" && item.look !== undefined && rows.slice(0, index).findLast((before) => before.what === "capsule")?.look !== item.look);
  // What the label said at a moment: its newest row up to then, and a row of the same frame counts.
  const saidAt = (ms: number) => rows.filter((item) => item.what === "label" && item.at <= ms).at(-1)?.says ?? null;
  const under = (look: string) => [...new Set(looks.filter((item) => item.look === look).map((item) => saidAt(item.at)))];
  const talked = looks.flatMap((item, index) => (item.look === "listening" ? [[item.at, looks[index + 1]?.at ?? Infinity]] : []));
  const noLabelWhileHeTalked = !rows.some((item) => item.what === "label" && item.says != null && talked.some(([from, to]) => item.at >= from && item.at < to));
  return { theKeyTheMindNamed: ready?.holdKey ?? null, onceHeLetGo: under("thinking"), whileItAnswered: under("speaking"), atRest: under("rest"), noLabelWhileHeTalked };
}
