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
