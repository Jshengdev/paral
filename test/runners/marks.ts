// The runner for rows about the three marks that say something of a line: a tick ("this is done"), a strike ("this
// has passed") and a tag (a chip of a few words). Moments of a hand-written run on a drawn page, through the real
// scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { onTheirLines } from "./leads.ts";
import { at, DISPLAY, textOf, type Box } from "./placed.ts";

type Point = [number, number];
type Item = { what: string; id?: string; box: Box; path?: Point[] };
const root = join(import.meta.dirname, "..", "..");
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const within = (p: Point, b: Box) => p[0] > b.x && p[0] < b.x + b.w && p[1] > b.y && p[1] < b.y + b.h;
const round = (value: number, n = 1) => Math.round(value * 10 ** n) / 10 ** n;
const bounds = (path: Point[]): Box => {
  const xs = path.map((p) => p[0]), ys = path.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
// Every piece of ours a tag must not lie on: the ink, the other tags, the cards, the pill and the resting cursor.
const PIECES = ["mark", "echo", "chip", "board", "clip", "way", "toast", "guide", "nudge", "capsule", "pointer"];

/**
 * At each moment: every mark's ink and every tag, described against the line it is about. A tick: whether it is
 * left of its line's words, how far clear of them, how tall, and whether it touches any read line. A strike: how far
 * it starts before its line and ends past it, whether it rises and stays inside its line's height. Other ink: only
 * that it is there. A tag: where it sits (after its line, above its line's end, or not placed), how far clear of its
 * line's words and ink, how large against its size at `wholeAt`, and whether it lies on a read line or on any other
 * piece of ours. And the cursor: on the pen's tip, or resting, and on a tag or not; and where the arrow from a mark
 * leaves from. With `reduced`, the same moments with motion reduced.
 */
export function marks(input: { lines: string[]; rows: Written[]; at: number[]; wholeAt?: number; reduced?: boolean }) {
  const rows = onTheirLines(input.rows, input.lines);
  const dir = handWritten("marks", rows, input.lines);
  const text = textOf(dir);
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  let probe = (moments: number[]) => at(dir, moments);
  if (input.reduced) {
    writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: true } }));
    probe = (moments) => JSON.parse(execFileSync(join(root, "body", ".build", "debug", "paral-headless"), ["placed", dir, join(dir, "tokens.json"), ...moments.map(String)], { encoding: "utf8" }));
  }
  // What each key was sent as: its ink's kind, and the line it is about.
  const sent = new Map<string, { kind: string; line: Box }>();
  for (const row of rows) if (row.line.type === "mark" && row.line.kind !== "tag") sent.set(`${row.line.id}/${row.line.beat}`, { kind: String(row.line.kind), line: row.line.box as Box });
  const lineOf = (row: Written) => row.line.box as Box;
  const tagLine = new Map(rows.filter((row) => row.line.type === "mark" && row.line.kind === "tag").map((row) => [`${row.line.id}/${row.line.beat}`, lineOf(row)]));
  const whole = input.wholeAt === undefined ? [] : (probe([input.wholeAt])[0].placed as Item[]);
  return probe(input.at).map(({ placed, pointer }) => {
    const items = placed as Item[];
    const ink = items.filter((item) => item.what === "mark");
    const chips = items.filter((item) => item.what === "chip" || item.what === "chip-unplaced");
    const described: Record<string, unknown> = {};
    for (const item of ink) {
      const mark = sent.get(item.id ?? "");
      const path = item.path ?? [];
      if (!mark || path.length < 2) continue;
      const { kind, line } = mark, drawn = bounds(path), others = text.filter((other) => !touches(other, line));
      if (kind === "tick") {
        described[`${item.id} tick`] = { leftOfItsWords: drawn.x + drawn.w <= line.x, clearOfTheWords: Math.round(line.x - (drawn.x + drawn.w)), tall: Math.round(drawn.h), onAnyReadLine: path.some((p) => text.some((other) => within(p, other))) };
      } else if (kind === "strike") {
        const first = path[0], last = path.at(-1)!;
        described[`${item.id} strike`] = { startsBeforeItsLine: round(line.x - first[0]), endsPastIt: round(last[0] - (line.x + line.w)), rises: last[1] < first[1], insideItsLine: path.every((p) => p[1] > line.y && p[1] < line.y + line.h), onOtherLines: path.some((p) => others.some((other) => within(p, other))) };
      } else described[`${item.id} ${kind}`] = "drawn";
    }
    for (const chip of chips) {
      const line = tagLine.get(chip.id ?? "")!;
      if (chip.what === "chip-unplaced") {
        described[`${chip.id} tag`] = "not placed";
        continue;
      }
      const box = chip.box, end = line.x + line.w;
      const ownInk = ink.filter((item) => item.id === chip.id).map((item) => bounds(item.path ?? []));
      const reach = Math.max(end, ...ownInk.map((b) => b.x + b.w + tokens.mark.width / 2));
      const level = box.y < line.y + line.h && line.y < box.y + box.h;
      const full = whole.find((item) => item.what === "chip" && item.id === chip.id)?.box;
      described[`${chip.id} tag`] = {
        where: level && box.x >= end ? "after its line" : box.y + box.h <= line.y ? "above its line's end" : "elsewhere",
        ...(level ? { clearOfItsLineAndInk: Math.round(box.x - reach) } : { rightEdgeAtTheLinesEnd: Math.abs(box.x + box.w - end) < 1 }),
        ...(full ? { size: round(box.w / full.w, 2) } : {}),
        insideTheDisplay: box.x >= 0 && box.y >= 0 && box.x + box.w <= DISPLAY.w && box.y + box.h <= DISPLAY.h,
        onAReadLine: text.some((other) => touches(other, box)),
        onOurPieces: items.filter((item) => PIECES.includes(item.what) && item !== chip && touches(item.box, box)).map((item) => item.what),
      };
    }
    const cursor = items.find((item) => item.what === "pointer")?.box;
    const tip = ink.at(-1)?.path?.at(-1);
    const onPen = pointer && tip ? Math.hypot(pointer.x - tip[0], pointer.y - tip[1]) < 1 : false;
    const lead = items.find((item) => item.what === "lead")?.id ?? null;
    // Off the pen, the cursor is named by the nearest ink or tag to its tip.
    const far = (b: Box) => (pointer ? Math.hypot(Math.max(b.x - pointer.x, pointer.x - (b.x + b.w), 0), Math.max(b.y - pointer.y, pointer.y - (b.y + b.h), 0)) : Infinity);
    const nearest = [...ink, ...chips.filter((chip) => chip.what === "chip")].sort((a, b) => far(a.box) - far(b.box))[0];
    const by = nearest ? `${nearest.id} ${nearest.what === "chip" ? "tag" : sent.get(nearest.id ?? "")?.kind}` : "nothing";
    return {
      ...described,
      cursor: !pointer || !cursor ? "none" : `${onPen ? "on the pen's tip" : `nearest ${by}`}${chips.some((chip) => chip.what === "chip" && touches(chip.box, cursor)) ? ", on a tag" : ""}`,
      arrowLeaves: lead === null ? null : lead.split(">")[0],
    };
  });
}
