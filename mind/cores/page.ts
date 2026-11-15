/** One of USC's pages, read ahead of time and kept as text: see `pages/`. */
export type KeptPage = { name: string; url: string; readOn: string; title: string; lines: string[] };

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Which kept page is on his screen: the one whose text holds the most of the lines read from the screen, when it
 * holds at least `least` of them and more than any other page does. Short lines (a menu word, a button) are not
 * counted, since every page of a site has them. Null when no page is clearly the one.
 */
export function whichPage(seen: string[], kept: KeptPage[], least: number): KeptPage | null {
  const read = seen.map(plain).filter((line) => line.length >= 15);
  const scored = kept
    .map((page) => {
      const text = page.lines.map(plain).join(" \n ");
      return { page, found: read.filter((line) => text.includes(line)).length };
    })
    .sort((a, b) => b.found - a.found);
  const [best, next] = scored;
  if (best === undefined || best.found < least || (next !== undefined && next.found === best.found)) return null;
  return best.page;
}

/** The kept pages to tell the model about: the one on his screen first, then the others of the same site. */
export function together(page: KeptPage, kept: KeptPage[]): KeptPage[] {
  const host = new URL(page.url).host;
  return [page, ...kept.filter((other) => other !== page && new URL(other.url).host === host)];
}

/**
 * Where a page holds a line, as places in its kept lines (already made plain): the kept lines that begin with it, or,
 * when none does, the kept lines it begins with, since a screen can join two of the page's lines into one.
 */
function placesOf(kept: string[], line: string): number[] {
  const want = plain(line);
  if (want === "") return [];
  const begins = kept.flatMap((held, at) => (held.startsWith(want) ? [at] : []));
  return begins.length > 0 ? begins : kept.flatMap((held, at) => (held.length >= 15 && want.startsWith(held) ? [at] : []));
}

/** Whether a kept page holds a line: a guard for a line a model says the page writes. */
export const holds = (page: KeptPage, line: string): boolean => placesOf(page.lines.map(plain), line).length > 0;

/**
 * Which way a kept line lies from what is on his screen: up, down, or null when it cannot be told or the line is
 * within what is in view. The lines on screen that the page holds exactly once give the stretch of the page in view;
 * the line is before that stretch or after it. A line the page holds more than once is taken at its nearest place.
 */
export function whichWay(seen: string[], page: KeptPage, line: string): "up" | "down" | null {
  const kept = page.lines.map(plain);
  const once = seen.map(plain).filter((read) => read.length >= 15).map((read) => kept.flatMap((held, at) => (held.includes(read) ? [at] : []))).filter((places) => places.length === 1).flat();
  const places = placesOf(kept, line);
  if (once.length === 0 || places.length === 0) return null;
  const top = Math.min(...once), bottom = Math.max(...once);
  if (places.some((at) => at >= top && at <= bottom)) return null;
  const away = (at: number) => (at < top ? top - at : at - bottom);
  return places.reduce((nearest, at) => (away(at) < away(nearest) ? at : nearest)) < top ? "up" : "down";
}

/**
 * The heading a kept line sits under, as the page writes it. A page that folds its sections writes each of their
 * headings with a "+" after it, and the nearest of those above the line is the one; a line that is itself such a
 * heading sits under none. On a page with none above the line, the heading the model named is taken when the page
 * holds it as a line above this one. Otherwise "": a heading the page does not hold is never boxed.
 */
export function headingOf(page: KeptPage, line: string, named: string): string {
  const kept = page.lines.map(plain);
  const at = placesOf(kept, line)[0] ?? -1;
  const folds = (text: string) => /\+\s*$/.test(text);
  if (at < 0) return kept.includes(plain(named)) ? named : "";
  if (folds(page.lines[at])) return "";
  const above = page.lines.slice(0, at);
  return above.findLast(folds) ?? (above.map(plain).includes(plain(named)) ? named : "");
}

/** A line read off the screen, as far as `movedUnder` needs it: its words and where its box begins. */
type Read = { text: string; box: { x: number; y: number } };

/**
 * Whether the page has moved under what was drawn on it, between two readings of the screen. Only a line read once
 * in each reading is compared, by its words, so a line is never taken for its twin. The page has moved when fewer
 * than half of the earlier reading's lines are found again (another part of the page is up, whatever a menu that
 * stays put says), or when more than half of those found again now begin `least` or more from where they began,
 * across or down. `least` is in the readings' own units. Less than that is the text reader's wobble.
 */
export function movedUnder(then: Read[], now: Read[], least: number): boolean {
  const once = (lines: Read[]) => new Map(lines.filter((line) => lines.filter((other) => other.text === line.text).length === 1).map((line) => [line.text, line.box]));
  const [before, after] = [once(then), once(now)];
  const again = [...before].flatMap(([text, was]) => (after.has(text) ? [{ was, is: after.get(text)! }] : []));
  const elsewhere = again.filter(({ was, is }) => Math.abs(is.x - was.x) >= least || Math.abs(is.y - was.y) >= least);
  return again.length * 2 < before.size || elsewhere.length * 2 > again.length;
}
