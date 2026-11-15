import type { Hands, Screen } from "./ask.ts";
import { fitted } from "./cores/beats.ts";
import { locate, type Box } from "./cores/ground.ts";
import { dateLine } from "./cores/keep.ts";
import { foldedUnder, headingOf, whichWay, type KeptPage } from "./cores/page.ts";
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
 * the way leads to. `opens` is true when the place is a heading that is closed over the thing: the kept page writes
 * that heading with its + sign, and the thing's own line is not in view.
 */
export type Where = { box: Box | null; on: string | null; inView: boolean; kind: MarkKind; to: "up" | "down" | null; toward: string; opens: boolean };

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
  // A line whose place is within what is on his screen and that is not read there is folded away, perhaps inside a
  // section that is itself inside a closed one: the nearest heading above it that is on his screen stands for it.
  const read = seen.lines.map((each) => each.text);
  const over = line.found || heading?.found ? undefined : foldedUnder(read, page, thing.line).slice(0, 3).map((fold) => locate(fold, seen.lines, seen.display, settings.groundMinScore.value)).find((fold) => fold.found);
  const target = line.found ? line : heading?.found ? heading : (over ?? null);
  // What the way leads to: the heading without the sign that opens it, or the start of the line up to its colon (and
  // without that sign, when the line is itself a heading), cut at a whole word when it is long.
  const start = thing.line.replace(/\s*\+\s*$/, "").split(/:\s+/)[0].trim();
  const toward = thing.under.replace(/\s*[+\-–−]\s*$/, "").trim() || (start.length <= 40 ? start : start.slice(0, 40).replace(/\s+\S*$/, "") + "…");
  const to = target ? null : whichWay(read, page, thing.line);
  // The thing's own line gets the ring; a line that opens a section (the page writes it with its + sign) is a thing to open, and gets the box.
  const kind = line.found && !/\+\s*$/.test(line.line) ? fitted("ring", line.line, seen.lines, settings.ringReach.value, seen.display.scale) : "box";
  return { box: target?.box ?? null, on: target?.line ?? null, inView: line.found, kind, to, toward, opens: !line.found && ((heading?.found === true && /\+\s*$/.test(thing.under)) || over !== undefined) };
}

/** What goes with a mark on the thing's own line: a strike in the mark's place for what has passed, and a tag beside the line. */
export type More = { strike?: boolean; tag?: { label: string; tone: "strong" | "quiet" | "date" } };

/**
 * Draws where it is: a mark on the place, or the way to it. On the thing's own line (not its heading) `more` adds to
 * it. Gives back the words for the log.
 */
export function point(send: Hands["send"], id: string, where: Where, more: More = {}): string {
  const own = where.box !== null && where.inView;
  if (where.box) send({ v, type: "mark", id, beat: 0, kind: own && more.strike ? "strike" : where.kind, box: where.box });
  else if (where.to && where.toward !== "") send({ v, type: "way", id, to: where.to, toward: where.toward });
  if (where.box && own && more.tag) send({ v, type: "mark", id, beat: 0, kind: "tag", box: where.box, label: more.tag.label, tone: more.tag.tone });
  if (where.box) return `the mark is on "${where.on}"`;
  return where.to ? `the way is ${where.to}, toward "${where.toward}"` : "nothing is marked, since neither the line nor its heading is in view and the way cannot be told";
}

/**
 * Where a page's name stands on his screen, as a link to click: the shortest line that holds the name, which is the
 * likeliest to be the link itself. A reader often takes a row of menu items for one line, so when the line holds
 * more than the name, the name's share of the line's letters gives its part of the box. Null when it is not there.
 */
function linkTo(settings: Settings, seen: Seen, name: string): { box: Box; on: string } | null {
  const [holds] = seen.lines.filter((read) => ` ${plain(read.text)} `.includes(` ${plain(name)} `)).sort((a, b) => a.text.length - b.text.length);
  if (holds === undefined) return null;
  const whole = locate(holds.text, seen.lines, seen.display, settings.groundMinScore.value);
  const at = holds.text.toLowerCase().indexOf(name.toLowerCase());
  if (!whole.found) return null;
  if (at < 0 || holds.text.length === name.length) return { box: whole.box, on: holds.text };
  const { x, y, w, h } = whole.box;
  return { box: { x: x + (w * at) / holds.text.length, y, w: (w * name.length) / holds.text.length, h }, on: name };
}

/**
 * Where an answer sent him: another kept page (`sent`), the line of this page it pointed at with the heading over
 * it (`target`), and whether that place was off his screen, so an arrow went out for it (`way`).
 */
export type After = { sent: KeptPage | null; target: { line: string; under: string } | null; way: boolean };

/**
 * After an answer on a kept page: where it sent him. Another kept page it named, when that page's name is on his
 * screen, is boxed where it stands (see `linkTo`), unless the answer marked that name itself (`drawn`: what is drawn now). Otherwise the way to what is out of view: a date it named that the
 * page writes on a line out of view comes first, named by the heading the page puts it under; with that heading in
 * view there is nothing to scroll to. Failing a date, a folded section of the page that the answer names by its
 * heading ("in the section called Officer Trainings") and that is out of view. One way at most. Gives back the
 * other kept page the answer sent him to, and where on this page it pointed, for the looks that follow to keep to.
 */
export function wayAfter({ ports, settings, send, log }: Hands, id: string, seen: Seen, page: KeptPage, told: string[], drawn: string[] = []): After {
  const said = told.join(" ");
  // The page it sent him to comes first. When the answer names another kept page and that name is on his screen, in
  // the site's menu or as a link, it is boxed: that is where to click.
  const short = (other: KeptPage) => other.title.split(" - ")[0].trim();
  // It sent him there when it says so in words ("the RSO Resources page"), or when it names the page and its own
  // mark is on that name: a ring on the link is where it sent him, however the sentence is worded.
  const ringed = (name: string) => drawn.some((thing) => plain(thing).includes(name));
  const names = (other: KeptPage) => plain(said).includes(`${plain(short(other))} page`) || (plain(said).includes(plain(short(other))) && ringed(plain(short(other))));
  const [elsewhere] = ports.pages.filter((other) => other.name !== page.name && short(other).length >= 8 && names(other)).sort((a, b) => short(b).length - short(a).length);
  const sent = elsewhere ?? null;
  const gone: After = { sent, target: null, way: false };
  const link = elsewhere === undefined ? null : linkTo(settings, seen, short(elsewhere));
  if (elsewhere !== undefined && link !== null) {
    // The answer may have marked that name itself; one mark on two words is enough.
    if (drawn.some((thing) => plain(thing).includes(plain(link.on)))) log(`${id}: the answer sent him to the page "${elsewhere.title}" and marked its name on his screen itself; no second mark`);
    else {
      send({ v, type: "mark", id, beat: 0, kind: "box", box: link.box });
      log(`${id}: the answer sent him to the page "${elsewhere.title}", whose name is on his screen; the mark is on "${link.on}"`);
    }
    return gone;
  }
  const kept = dateLine(said, [page]);
  if (kept !== null) {
    const where = whereIs(settings, seen, page, { line: kept.written, under: headingOf(page, kept.written, "") });
    const off = where.box === null && where.to !== null;
    if (off) log(`${id}: the answer named a date this page writes out of view; ${point(send, id, where)}`);
    return { sent, target: { line: kept.written, under: headingOf(page, kept.written, "") }, way: off };
  }
  // A section is named in speech by the start of its heading, up to its colon ("the Officer Trainings section"), so
  // that is what is looked for in what was said, and what the way is named by. The longest such name wins.
  const name = (heading: string) => heading.replace(/\s*\+\s*$/, "").split(/:\s+/)[0].trim();
  const [section] = page.lines.filter((line) => /\+\s*$/.test(line) && name(line).length >= 8 && plain(said).includes(plain(name(line)))).sort((a, b) => name(b).length - name(a).length);
  if (section === undefined) return gone;
  const where = whereIs(settings, seen, page, { line: section, under: "" });
  const off = where.box === null && where.to !== null;
  if (off) log(`${id}: the answer named a section of this page that is out of view; ${point(send, id, { ...where, toward: name(section) })}`);
  else if (where.opens) log(`${id}: the answer named a section that is folded away inside a closed one; ${point(send, id, where)}`);
  return { sent, target: { line: section, under: "" }, way: off };
}

/** The steps of a walk that are behind him: each whose own line is in view gets a tick and a quiet tag. */
export function finished(send: Hands["send"], id: string, settings: Settings, seen: Seen, page: KeptPage, done: { line: string; under: string }[], word: string): number {
  let ticked = 0;
  for (const step of done) {
    const where = whereIs(settings, seen, page, step);
    if (where.box === null || !where.inView) continue;
    send({ v, type: "mark", id, beat: 0, kind: "tick", box: where.box });
    send({ v, type: "mark", id, beat: 0, kind: "tag", box: where.box, label: word, tone: "quiet" });
    ticked += 1;
  }
  return ticked;
}
