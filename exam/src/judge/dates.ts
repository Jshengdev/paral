import type { Expect, Truth } from "../shape.ts";
import type { PageRead } from "./pages.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";

// A date is a month and a day, as "March 1", "Mar 1st" or "December 9-16". A wrong date costs a student a deadline,
// so three things are held: a date the scenario names is said as the page writes it, no date is said that it has
// no page for, and where the scenario asks it, the answer says what the date means for him (that it has passed).
// His words of 2026-11-14: it may say a date that is not on the page in front of him when it read it on another
// page, and it "shouldn't say things that doesn't have information on". So a date may come from the page on his
// screen, from a page the build's record says it gave the model with this ask, from his own words, or be today.
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH = new RegExp(`\\b(${MONTHS.join("|")}|${MONTHS.map((m) => m.slice(0, 3)).join("|")}|sept)\\b\\.?`, "gi");
const key = (month: string) => month.toLowerCase().slice(0, 3);

/** Each month in the text with the day numbers written after it: "December 5 through 8" gives dec 5 and dec 8. */
function dates(text: string): { month: string; day: number; said: string }[] {
  const found = [...text.matchAll(MONTH)];
  return found.flatMap((m, index) => {
    const from = (m.index ?? 0) + m[0].length;
    const until = Math.min(index + 1 < found.length ? found[index + 1].index ?? text.length : text.length, from + 40);
    const days = [...text.slice(from, until).matchAll(/\b([12]?\d|3[01])(?:st|nd|rd|th)?\b(?!:)/g)].map((d) => Number(d[1])).filter((d) => d >= 1 && d <= 31);
    return days.map((day) => ({ month: key(m[1]), day, said: `${m[1]} ${day}` }));
  });
}

// As the page writes it: the same letters and digits, with "1st" read as "1" and commas and case let go.
const plain = (text: string) => text.toLowerCase().replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1").replace(/[,.]/g, " ").replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim();

const answerOf = (ask: Ask) => [...of(ask.moments, "say").filter((m) => !m.opener).map((m) => m.text), ...of(ask.moments, "mark").map((m) => m.label ?? ""), ...of(ask.moments, "board").map((m) => m.text)].join(" ");

/** What the build knew besides his screen: the pages it gave the model with this ask, and the day of the run. */
export type Known = { pages: PageRead[]; ranOn: Date };

const DAY_MS = 24 * 60 * 60 * 1000;
const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

// The run's day as he lives it, in Los Angeles: a run at 7 pm there is already the next day by the world's clock.
const dayOf = (ranOn: Date) => ranOn.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).split("-").map(Number);

/** Whole days from the day of the run to a month and day, in the year that puts it nearest: 8, or -12 for one gone. */
function daysTo(ranOn: Date, month: string, day: number): number {
  const [year, m, d] = dayOf(ranOn);
  const from = Date.UTC(year, m - 1, d);
  const index = MONTHS.findIndex((name) => name.startsWith(month));
  const away = [year - 1, year, year + 1].map((y) => Math.round((Date.UTC(y, index, day) - from) / DAY_MS));
  return away.reduce((nearest, days) => (Math.abs(days) < Math.abs(nearest) ? days : nearest));
}

/** What the judge holds about dates in one answer. */
export function datesSaid(ask: Ask, expect: Expect, truth: Truth[], known: Known | null = null): Verdict[] {
  const s = ask.index;
  // The day of the run is known without a page: it may say "today is November 14".
  const today = known ? [{ title: "today's date", url: "today", lines: [known.ranOn.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Los_Angeles" })] }] : [];
  const read = [...(known?.pages ?? []), ...today];
  const answer = answerOf(ask);
  const out: Verdict[] = [];
  for (const phrase of expect.says ?? []) {
    const what = `It says "${phrase}", as the page writes it`;
    out.push(plain(answer).includes(plain(phrase)) ? yes("C13", s, what, "it does") : no("C13", s, what, `it said: "${answer.slice(0, 110)}"`));
  }
  for (const phrase of expect.neverSays ?? []) {
    const what = `It never says "${phrase}"`;
    out.push(plain(answer).includes(plain(phrase)) ? no("C13", s, what, `it said: "${answer.slice(0, 110)}"`) : yes("C13", s, what, "it does not"));
  }
  if (expect.saysThat) {
    // Whole words only: "ago" is not in "Chicago". The list is a sign, not the meaning; a reader reads every pass.
    const sign = expect.saysThat.anyOf.find((word) => new RegExp(`\\b${plain(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(plain(answer)));
    const what = `It says that ${expect.saysThat.what}`;
    out.push(sign ? yes("C13", s, what, `it says "${sign}"`) : no("C13", s, what, `none of "${expect.saysThat.anyOf.join('", "')}" in: "${answer.slice(0, 110)}"`));
  }
  if (expect.countsDaysTo && known) {
    const [to] = dates(expect.countsDaysTo);
    if (!to) throw new Error(`"${expect.countsDaysTo}" names no month and day to count to`);
    const days = Math.abs(daysTo(known.ranOn, to.month, to.day));
    const word = NUMBERS[days] ?? String(days);
    const what = `It counts the days to ${expect.countsDaysTo} rightly`;
    const right = new RegExp(`\\b(${days}|${word}) days?\\b`).test(plain(answer));
    out.push(right ? yes("C13", s, what, `${days} days from the day of the run, and it says so`) : no("C13", s, what, `it is ${days} days from the day of the run; it said: "${answer.slice(0, 110)}"`));
  }
  const said = dates(answer);
  if (said.length === 0 || truth.length === 0) return out;
  const on = (texts: string[]) => new Set(texts.flatMap(dates).map((d) => `${d.month} ${d.day}`));
  const shown = on(truth.map((t) => t.text));
  // A date he said himself may be said back to him: it is his, not made up.
  const his = on(of(ask.moments, "heard").slice(-1).map((m) => m.text));
  const elsewhere = said.filter((d) => !shown.has(`${d.month} ${d.day}`) && !his.has(`${d.month} ${d.day}`));
  const madeUp = elsewhere.filter((d) => !read.some((page) => on(page.lines).has(`${d.month} ${d.day}`)));
  const what = "Every date it says is on a page it read";
  if (madeUp.length > 0) return [...out, no("C13", s, what, `it said ${madeUp[0].said}, which is on no page it read`)];
  // A date that is not on his screen is named with the page that holds it, so a reader can see where it came from.
  const from = elsewhere.map((d) => `${d.said} from "${read.find((page) => on(page.lines).has(`${d.month} ${d.day}`))?.title}"`);
  const where = elsewhere.length === 0 ? "each on the page in front of him or in his own words" : `${said.length - elsewhere.length} on the page in front of him or in his own words; not there: ${[...new Set(from)].join(", ")}`;
  return [...out, yes("C13", s, what, `${said.length} dates, ${where}`)];
}
