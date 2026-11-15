/** A page as paral keeps it: its title, its text line by line in reading order, and the other pages it links to. */
export type Read = { title: string; lines: string[]; links: { text: string; url: string }[] };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
const decoded = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
const tidy = (text: string) => decoded(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/**
 * The words of a page of HTML, as a person would read them down the page, with what is inside closed sections too
 * (their words are in the page; only the browser hides them). Scripts, styles, the site's header, footer and menus
 * are left out. A link keeps its words in the text and is also listed with the address it goes to.
 */
export function readable(html: string, address: string): Read {
  const title = tidy(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|form)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? body.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? body;

  const links: Read["links"] = [];
  for (const [, href, inner] of main.matchAll(/<a\b[^>]*?href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = tidy(inner);
    let url: string;
    try {
      url = new URL(decoded(href), address).href;
    } catch {
      continue;
    }
    if (text.length > 1 && /^https?:/.test(url) && !links.some((link) => link.url === url)) links.push({ text, url });
  }

  // Every tag that starts a new line for a reader becomes a line break; what is left between breaks is one line.
  const broken = main.replace(/<\/?(p|div|section|article|li|ul|ol|h[1-6]|tr|table|br|button|summary|details|dt|dd|blockquote|figcaption|td|th)\b[^>]*>/gi, "\n");
  const lines = broken
    .split("\n")
    .map(tidy)
    .filter((line) => line.length > 1);
  // The same line twice in a row is a menu or a label repeated for screen readers.
  return { title, lines: lines.filter((line, index) => line !== lines[index - 1]), links };
}
