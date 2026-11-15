import { datesIn } from "./dates.ts";
import type { KeptPage } from "./page.ts";

/**
 * When a line a page writes falls: the day, the clock time if the line gives one, and whether the line wrote the year
 * itself. A line with no year gets the year nearest to today, the same rule `daysFrom` counts by.
 */
export type When = { year: number; month: number; day: number; hour: number | null; minute: number | null; yearWritten: boolean };

/** "11:59pm", "11:59 pm", "4:00-05:00 pm" (the first time takes the second's half of the day), "NOON". */
const RANGE = /\b(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*\d{1,2}(?::\d{2})?\s*([ap])\.?m\b/i;
const CLOCK = /\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\b/i;
const DAY = 24 * 60 * 60 * 1000;

/**
 * The day and time a written line names, or null when it names no month and day ("Mid-February"). Only the first date
 * on the line is read. "Midnight" is left as the whole day: a page rarely says which end of the day it means.
 */
export function when(written: string, today: Date): When | null {
  const [date] = datesIn(written);
  if (date === undefined) return null;
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const years = date.year === null ? [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1] : [date.year];
  const year = years.reduce((nearest, y) => (Math.abs(Date.UTC(y, date.month - 1, date.day) - start) < Math.abs(Date.UTC(nearest, date.month - 1, date.day) - start) ? y : nearest));
  const clock = /\bnoon\b/i.test(written) ? ["", "12", "00", "p"] : (RANGE.exec(written) ?? CLOCK.exec(written));
  const hour = clock ? (Number(clock[1]) % 12) + (clock[3].toLowerCase() === "p" ? 12 : 0) : null;
  const sound = clock !== null && Number(clock[1]) >= 1 && Number(clock[1]) <= 12 && Number(clock[2] ?? 0) < 60;
  return { year, month: date.month, day: date.day, hour: sound ? hour : null, minute: sound ? Number(clock![2] ?? 0) : null, yearWritten: date.year !== null };
}

const two = (n: number) => String(n).padStart(2, "0");
const day = (year: number, month: number, d: number) => `${year}${two(month)}${two(d)}`;
/** Text inside a calendar file: backslash, semicolon, comma and line break are written with a backslash. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** A calendar file's line is at most 75 bytes; the rest goes on lines that begin with a space. */
function folded(line: string): string[] {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = Math.min(rest.length, out.length === 0 ? 75 : 74);
    while (new TextEncoder().encode(rest.slice(0, cut)).length > (out.length === 0 ? 75 : 74)) cut -= 1;
    out.push((out.length === 0 ? "" : " ") + rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  out.push((out.length === 0 ? "" : " ") + rest);
  return out;
}
/** The same entry kept twice has the same name, so a calendar replaces it instead of doubling it. */
function mark(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return h.toString(36);
}

/**
 * The text of a calendar file (.ics) holding one entry: the date as the page writes it, on the day `when` reads from
 * it, with the page's address. A line with a clock time gives a timed entry in the reader's own time zone, since the
 * page writes none; a line with only a day gives an all-day entry. Null when the line names no month and day.
 * The entry says what the page wrote, and says so when the year is not the page's own.
 */
export function calendarFile(entry: { title: string; written: string; today: Date; url: string }): string | null {
  const at = when(entry.written, entry.today);
  if (at === null) return null;
  const next = new Date(Date.UTC(at.year, at.month - 1, at.day) + DAY);
  const t = entry.today;
  const stamp = `${day(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())}T${two(t.getUTCHours())}${two(t.getUTCMinutes())}${two(t.getUTCSeconds())}Z`;
  const starts = at.hour === null
    ? [`DTSTART;VALUE=DATE:${day(at.year, at.month, at.day)}`, `DTEND;VALUE=DATE:${day(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())}`]
    : [`DTSTART:${day(at.year, at.month, at.day)}T${two(at.hour)}${two(at.minute ?? 0)}00`];
  const said = `The page writes: "${entry.written.trim()}"${at.yearWritten ? "" : ` It gives no year; ${at.year} is the nearest to the day this was kept.`}\nFrom ${entry.url}`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//lost and found//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${day(at.year, at.month, at.day)}-${mark(`${entry.title}|${entry.url}`)}@lostandfound`, `DTSTAMP:${stamp}`, ...starts,
    `SUMMARY:${text(entry.title.trim())}`, `DESCRIPTION:${text(said)}`, `URL:${entry.url}`, "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.flatMap(folded).join("\r\n") + "\r\n";
}

/** A date he may keep: what it is for, the line as the page writes it, and the page's address. */
export type ToKeep = { title: string; written: string; url: string };

/** The name of a calendar entry for a kept line: the first sentence of the part that is not its date, then the page's title. */
export function named(written: string, page: string): string {
  const what = written.split(/:\s+/).find((part) => datesIn(part).length === 0)?.trim().split(/\.(\s|$)/)[0] ?? "";
  return what === "" ? page : `${what} · ${page}`;
}

/**
 * The kept line that writes a date an answer named, with its page: what "add it to my calendar" keeps after an
 * answer. The first date said that some page writes is taken, from the first page that writes it. Null when the
 * answer named no date a kept page writes.
 */
export function dateLine(said: string, pages: KeptPage[]): ToKeep | null {
  for (const date of datesIn(said)) {
    for (const page of pages) {
      const written = page.lines.find((line) => datesIn(line).some((on) => on.month === date.month && on.day === date.day));
      if (written !== undefined) return { title: named(written, page.title), written, url: page.url };
    }
  }
  return null;
}
