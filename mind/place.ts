import type { Hands, Screen } from "./ask.ts";
import { fitted } from "./cores/beats.ts";
import { locate, type Box } from "./cores/ground.ts";
import { dateLine } from "./cores/keep.ts";
import { whichWay, type KeptPage } from "./cores/page.ts";
import type { Settings } from "./settings.ts";
import { SEAM_VERSION, type MarkKind } from "../seam/schema.ts";

const v = SEAM_VERSION;
const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** What is on his screen, from a press of the key or from a look: the lines read and where the display is. */
type Seen = Pick<Screen, "lines" | "display">;

/**
 * Where a kept line is on his screen now. `box` and `on` are the place to mark and the screen's line there: the line
 * itself (`inView`) or the heading it sits under. `kind` is the mark for it: the thing's own line gets a ring where
 * the lines around leave room for one (a hugging box or an underline where they do not), and a heading he should
 * open gets a box. With no place to mark, `to` is the way it lies, when that can be told, and `toward` names what
 * the way leads to.
 */
export type Where = { box: Box | null; on: string | null; inView: boolean; kind: MarkKind; to: "up" | "down" | null; toward: string };

/**
 * Whether a line on his screen is where a kept paragraph begins. His screen breaks a paragraph into several lines,
 * so its first line is the paragraph's first words, and it is a long line or the line after it carries the paragraph
 * on. A few words the paragraph happens to begin with are not it: a menu's "Recognized Student Organizations" is not
 * the start of "Recognized Student Organizations in good standing can request to book space".
 */
function beginsIt(kept: string, read: string, next: string): boolean {
  if (read.length < 12 || !kept.startsWith(read)) return false;
  const rest = kept.slice(read.length).trim();
  return read.length >= 40 || rest === "" || (next !== "" && (rest.startsWith(next) || next.startsWith(rest)));
}

/** Finds a kept line on his screen: the line itself or the line its paragraph begins on, else its heading, else the way. It sends nothing. */
export function whereIs(settings: Settings, seen: Seen, page: KeptPage, thing: { line: string; under: string }): Where {
  const begins = seen.lines.find((read, at) => beginsIt(plain(thing.line), plain(read.text), plain(seen.lines[at + 1]?.text ?? "")));
  const line = locate(begins?.text ?? thing.line, seen.lines, seen.display, settings.groundMinScore.value);
  const heading = thing.under === "" ? null : locate(thing.under, seen.lines, seen.display, settings.groundMinScore.value);
  const target = line.found ? line : heading?.found ? heading : null;
  // What the way leads to: the heading without the sign that opens it, or the start of the line up to its colon.
  const toward = thing.under.replace(/\s*[+\-–−]\s*$/, "").trim() || thing.line.split(/:\s+/)[0].slice(0, 40).trim();
  const to = target ? null : whichWay(seen.lines.map((read) => read.text), page, thing.line);
  const kind = line.found ? fitted("ring", line.line, seen.lines, settings.ringReach.value, seen.display.scale) : "box";
  return { box: target?.box ?? null, on: target?.line ?? null, inView: line.found, kind, to, toward };
}

/** Draws where it is: a box on the place, or the way to it. Gives back the words for the log. */
export function point(send: Hands["send"], id: string, where: Where): string {
  if (where.box) send({ v, type: "mark", id, beat: 0, kind: where.kind, box: where.box });
  else if (where.to && where.toward !== "") send({ v, type: "way", id, to: where.to, toward: where.toward });
  if (where.box) return `the mark is on "${where.on}"`;
  return where.to ? `the way is ${where.to}, toward "${where.toward}"` : "nothing is marked, since neither the line nor its heading is in view and the way cannot be told";
}

/** After an answer: when it named a date this kept page writes on a line that is not in view, the way to that line. */
export function wayToDate({ settings, send, log }: Hands, id: string, seen: Seen, page: KeptPage, told: string[]): void {
  const kept = dateLine(told.join(" "), [page]);
  if (kept === null) return;
  const where = whereIs(settings, seen, page, { line: kept.written, under: "" });
  if (where.box === null && where.to !== null) log(`${id}: the answer named a date this page writes out of view; ${point(send, id, where)}`);
}
