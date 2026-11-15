const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const NAMED = new RegExp(`\\b(${MONTHS.map((month) => `${month}|${month.slice(0, 3)}`).join("|")})\\.?,? (\\d{1,2})(?:st|nd|rd|th)?\\b(?:,? (\\d{4}))?`, "gi");

/** A day of the year a text names: its month (1 to 12), its day, and its year when the text writes one. */
export type Named = { month: number; day: number; year: number | null };

/** Every month and day a text names: "November 22", "Nov. 22nd", "July 1, 2026". "May" with a number after it counts; "may" alone does not. */
export function datesIn(text: string): Named[] {
  return [...text.matchAll(NAMED)]
    .map(([, month, day, year]) => ({ month: MONTHS.findIndex((name) => name.startsWith(month.toLowerCase().slice(0, 3))) + 1, day: Number(day), year: year ? Number(year) : null }))
    .filter((date) => date.day >= 1 && date.day <= 31);
}

/**
 * A month and day that the line says and none of the sources holds, or null when every date it says is in one of
 * them. A date he could not have read on a page paral has read is not said: it would be made up.
 */
export function unknownDate(said: string, sources: string[]): Named | null {
  const known = new Set(sources.flatMap(datesIn).map((date) => `${date.month}-${date.day}`));
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
