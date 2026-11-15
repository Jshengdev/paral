import { away, datesIn, unknownDate } from "./dates.ts";
import type { Box } from "./ground.ts";
import { dateLine } from "./keep.ts";
import type { Item, Notes } from "./notes.ts";
import { headingOf, holds, type KeptPage } from "./page.ts";

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const short = (page: KeptPage) => page.title.split(" - ")[0].trim();

/** One thing still ahead, as the looks found it on a kept page (`glance.ts` `Ahead`). */
export type Step = { step: string; by: string; from: string; at?: string };

/**
 * Where a step is written on its page: the line the look named for it when the page holds that line, else the line
 * that writes its date, with the heading the page puts that line under. Null when neither is known. As "show me"
 * places a step (`showme.ts`), so a picture is cut where the walk would box it.
 */
export function placeOf(step: Step, page: KeptPage): { line: string; under: string } | null {
  const by = step.by !== "" && unknownDate(step.by, page.lines) === null ? step.by : "";
  const dated = by === "" ? null : dateLine(by, [page]);
  const line = step.at && holds(page, step.at) ? step.at : (dated?.written ?? null);
  return line === null ? null : { line, under: headingOf(page, line, "") };
}

/** What the notes are made from: everything the mind already holds for the sitting. No model is asked for any of it. */
export type Sitting = {
  /** His first question in this sitting, in his own words; null when he has asked none. */
  goal: string | null;
  /** What the looks found ahead of him, in order. */
  ahead: Step[];
  pages: KeptPage[];
  /** The page lines whose dates he has kept in his calendar. */
  kept: string[];
  /** The steps of the walk ("show me") he has clicked or passed. */
  walked: string[];
  /** The cut-out picture of each step's section, by the step's words. */
  pictures: Record<string, string>;
  today: Date;
};

/**
 * A sitting's notes: one item for each step ahead, in order, with the date as the page writes it and how far off it
 * is, the page's title and address, the heading it sits under, the page's own line, and its picture when one was cut.
 * A step is done when he kept its date or walked past it. What could not be told is said, not left out: a step with no
 * date, a date its page does not write, a step with no line found, a page that is not kept. Null with nothing ahead.
 */
export function notesOf(sitting: Sitting): Notes | null {
  if (sitting.ahead.length === 0) return null;
  const couldNotTell: string[] = [];
  const keptDays = new Set(sitting.kept.flatMap(datesIn).map((date) => `${date.month}-${date.day}`));
  const items = sitting.ahead.map((step): Item => {
    const page = sitting.pages.find((kept) => kept.url === step.from) ?? null;
    if (page === null) couldNotTell.push(`"${step.step}" was found on a page Lost and Found has not read (${step.from}), so where it is cannot be shown.`);
    const by = page !== null && step.by !== "" && unknownDate(step.by, page.lines) === null ? step.by : "";
    if (step.by === "") couldNotTell.push(`No date is given for "${step.step}".`);
    else if (by === "" && page !== null) couldNotTell.push(`"${step.step}": the date "${step.by}" is not written on the page as it was read, so it is left out.`);
    const placed = page === null ? null : placeOf(step, page);
    if (page !== null && placed === null) couldNotTell.push(`No line of "${short(page)}" was found for "${step.step}".`);
    const quote = placed === null || page === null ? "" : (page.lines.find((line) => plain(line).startsWith(plain(placed.line))) ?? placed.line).replace(/\s*\+\s*$/, "");
    const day = datesIn(by)[0];
    const done = sitting.walked.includes(step.step) ? "done" : day !== undefined && keptDays.has(`${day.month}-${day.day}`) ? "in your calendar" : null;
    return {
      todo: step.step,
      due: by === "" ? null : { asWritten: by, left: away(by, sitting.today)?.words ?? "" },
      where: { page: page === null ? step.from : page.title, url: step.from, section: placed?.under.replace(/\s*\+\s*$/, "") ?? "" },
      quote,
      picture: sitting.pictures[step.step] ?? null,
      done,
    };
  });
  const titles = [...new Set(sitting.ahead.map((step) => sitting.pages.find((kept) => kept.url === step.from)).filter((page) => page !== undefined).map(short))];
  const made = sitting.today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return { title: titles.join(" · ") || "Your notes", goal: sitting.goal, made, items, couldNotTell };
}

/** The room kept round a marked box when its section is cut out, in screen points. `least` is the narrowest cut. */
export type Room = { above: number; below: number; side: number; least: number };

/**
 * The part of a look's picture to cut for a section paral marked: the box (screen points, from the top-left of the
 * main display) with room round it, in the pixels the look's lines were read at (`read`), kept inside the picture.
 * Null when nothing of it is on the picture.
 */
export function cutOut(box: Box, display: { x: number; y: number; scale: number }, read: { w: number; h: number }, room: Room): Box | null {
  const px = (point: number, origin: number) => (point - origin) * display.scale;
  const left = Math.max(0, px(box.x - room.side, display.x));
  const right = Math.min(read.w, px(box.x + Math.max(box.w, room.least) + room.side, display.x));
  const top = Math.max(0, px(box.y - room.above, display.y));
  const bottom = Math.min(read.h, px(box.y + box.h + room.below, display.y));
  if (right - left < 1 || bottom - top < 1) return null;
  return { x: Math.round(left), y: Math.round(top), w: Math.round(right - left), h: Math.round(bottom - top) };
}

/**
 * The same part in the saved copy, which is smaller than the picture the lines were read at: whole pixels, inside
 * the copy. Null when nothing is left.
 */
export function scaled(part: Box, read: { w: number; h: number }, copy: { w: number; h: number }): Box | null {
  const [sx, sy] = [copy.w / read.w, copy.h / read.h];
  const x = Math.max(0, Math.floor(part.x * sx)), y = Math.max(0, Math.floor(part.y * sy));
  const w = Math.min(copy.w - x, Math.ceil(part.w * sx)), h = Math.min(copy.h - y, Math.ceil(part.h * sy));
  return w < 1 || h < 1 ? null : { x, y, w, h };
}
