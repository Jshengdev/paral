const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH = `(${MONTHS.map((month) => `${month}|${month.slice(0, 3)}`).join("|")})`;
/** The last day of a span, straight after its first: "-16", " – 8", " through 8", " to 16". A time ("- 3 pm", "-05:00") is not one. */
const SPAN = "(?:\\s*(?:-|–|—|through|thru|to)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\b(?!:\\d|\\s?[ap]\\.?m\\b|\\d))?";
const NAMED = new RegExp(`\\b${MONTH}\\.?,? (\\d{1,2})(?:st|nd|rd|th)?\\b${SPAN}(?:,? (\\d{4}))?`, "gi");
const month = (name: string) => MONTHS.findIndex((full) => full.startsWith(name.toLowerCase().slice(0, 3))) + 1;

/** A day of the year a text names: its month (1 to 12), its day, and its year when the text writes one. */
export type Named = { month: number; day: number; year: number | null };

/** A day of the month as a word, the way it is said: "first" to "thirty-first", and "thirteen" to "thirty-one". */
const ONES = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
const TEENS = ["tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth"];
const COUNTED = ["thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const UNITS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
/** Each such word with its day. A count below thirteen ("one", "two") is left out: "in December one of the officers" names no day. */
const SAID: [string, number][] = [
  ...ONES.map((word, at): [string, number] => [word, at + 1]),
  ...TEENS.map((word, at): [string, number] => [word, at + 10]),
  ...COUNTED.map((word, at): [string, number] => [word, at + 13]),
  ["twentieth", 20], ["twenty", 20], ["thirtieth", 30], ["thirty", 30],
  ...ONES.flatMap((word, at): [string, number][] => [[`twenty[- ]${word}`, at + 21], ...(at === 0 ? ([[`thirty[- ]${word}`, 31]] as [string, number][]) : [])]),
  ...UNITS.flatMap((word, at): [string, number][] => [[`twenty[- ]${word}`, at + 21], ...(at === 0 ? ([[`thirty[- ]${word}`, 31]] as [string, number][]) : [])]),
];
// The longest words first, so "twenty-second" is not read as "twenty".
const SAID_DAY = `(${SAID.map(([word]) => word).sort((a, b) => b.length - a.length).join("|")})`;
/** A month and a day in words, either way round: "November twenty-second", "January the eighth, 2027", "the thirtieth of November". */
const WORDED = new RegExp(`\\b${MONTH}\\.?,? (?:the )?${SAID_DAY}\\b(?:,? (\\d{4}))?|\\b${SAID_DAY} of ${MONTH}\\b(?:,? (\\d{4}))?`, "gi");
const said = (word: string) => SAID.find(([each]) => new RegExp(`^${each}$`, "i").test(word))?.[1] ?? 0;

/**
 * Every month and day a text names: "November 22", "Nov. 22nd", "July 1, 2026". A span gives both its ends, and a
 * year after it is the year of both: "December 9-16", "December 5 through 8, 2026". "May" with a number after it
 * counts; "may" alone does not. A day written in words is read too, since a model sometimes writes a date the way it
 * is said: "November twenty-second", "the thirtieth of November". There "may" is never a month ("you may first
 * need"), which leaves a worded date in May unread.
 */
export function datesIn(text: string): Named[] {
  const digits = [...text.matchAll(NAMED)].flatMap(([, name, day, last, year]) => [day, ...(last === undefined ? [] : [last])].map((d) => ({ month: month(name), day: Number(d), year: year ? Number(year) : null })));
  const words = [...text.matchAll(WORDED)]
    .map(([, name, day, year, dayFirst, nameAfter, yearAfter]) => ({ name: name ?? nameAfter, day: said(day ?? dayFirst), year: year ?? yearAfter }))
    .filter(({ name }) => name.toLowerCase() !== "may")
    .map(({ name, day, year }) => ({ month: month(name), day, year: year ? Number(year) : null }));
  return [...digits, ...words].filter((date) => date.day >= 1 && date.day <= 31);
}

const A_MONTH = new RegExp(`\\b${MONTH}\\b`, "gi");
/** A number that can be a day: no part of a time or a longer number, and not a count of something. */
const A_DAY = /(?<![:\d])\b(\d{1,2})(?:st|nd|rd|th)?\b(?!:\d|\d|\s?[ap]\.?m\b|\s(?:days?|weeks?|months?|years?|hours?|minutes?|units?|credits?)\b)/gi;

/**
 * Every day a page may be giving for a month it names: each number that can be a day and stands within forty letters
 * after a month's name, with no other month between. It is wider than `datesIn` on purpose, and only for what a page
 * holds: a page writes "December 5, 6 and 8" and means three days, where only the first has its month in front of it.
 */
function daysHeld(text: string): string[] {
  const months = [...text.matchAll(A_MONTH)].filter((found) => found[0] !== "may");
  return [...text.matchAll(A_DAY)].flatMap((day) => {
    const before = months.findLast((found) => found.index < day.index);
    return before !== undefined && day.index - (before.index + before[0].length) < 40 ? [`${month(before[1])}-${Number(day[1])}`] : [];
  });
}

/**
 * A month and day that the line says and none of the sources holds, or null when every date it says is in one of
 * them. A date he could not have read on a page paral has read is not said: it would be made up.
 */
export function unknownDate(said: string, sources: string[]): Named | null {
  const known = new Set([...sources.flatMap(datesIn).map((date) => `${date.month}-${date.day}`), ...sources.flatMap(daysHeld)]);
  return datesIn(said).find((date) => !known.has(`${date.month}-${date.day}`)) ?? null;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * How many whole days from today to a named date: 8 for one eight days ahead, -18 for one eighteen days ago. A date
 * written with no year is taken as the one nearest to today, this year, last year or next.
 */
export function daysFrom(today: Date, date: Named): number {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const years = date.year === null ? [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1] : [date.year];
  const away = years.map((year) => Math.round((Date.UTC(year, date.month - 1, date.day) - start) / DAY));
  return away.reduce((nearest, days) => (Math.abs(days) < Math.abs(nearest) ? days : nearest));
}

/** A named date in words, for the model: "November 22" or "July 1, 2026". */
export function worded(date: Named): string {
  const month = MONTHS[date.month - 1];
  return `${month[0].toUpperCase()}${month.slice(1)} ${date.day}${date.year === null ? "" : `, ${date.year}`}`;
}

/**
 * A few words for how far a line's first date is from today, for a tag beside the line: "7 days left", "due
 * tomorrow", "due today", "closed yesterday", "closed 13 days ago". Null when the line names no date.
 */
export function away(line: string, today: Date): { words: string; days: number } | null {
  const [date] = datesIn(line);
  if (date === undefined) return null;
  const days = daysFrom(today, date);
  const words = days > 1 ? `${days} days left` : days === 1 ? "due tomorrow" : days === 0 ? "due today" : days === -1 ? "closed yesterday" : `closed ${-days} days ago`;
  return { words, days };
}
