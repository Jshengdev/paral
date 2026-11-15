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
 * Which way a kept line lies from what is on his screen: up, down, or null when it cannot be told or the line is
 * within what is in view. The lines on screen that the page holds exactly once give the stretch of the page in view;
 * the line is before that stretch or after it. A line the page holds more than once is taken at its nearest place.
 */
export function whichWay(seen: string[], page: KeptPage, line: string): "up" | "down" | null {
  const kept = page.lines.map(plain);
  const want = plain(line);
  const once = seen.map(plain).filter((read) => read.length >= 15).map((read) => kept.flatMap((held, at) => (held.includes(read) ? [at] : []))).filter((places) => places.length === 1).flat();
  const places = kept.flatMap((held, at) => (want !== "" && (held.startsWith(want) || (held.length >= 15 && want.startsWith(held))) ? [at] : []));
  if (once.length === 0 || places.length === 0) return null;
  const top = Math.min(...once), bottom = Math.max(...once);
  if (places.some((at) => at >= top && at <= bottom)) return null;
  const away = (at: number) => (at < top ? top - at : at - bottom);
  return places.reduce((nearest, at) => (away(at) < away(nearest) ? at : nearest)) < top ? "up" : "down";
}
