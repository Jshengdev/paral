import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BUILD, EXAM, run } from "./tools.ts";

// A real, public page, kept under tmp/ so it is never committed: it belongs to its publisher. The saved copy keeps
// the page's own styles (through a base address) and drops its scripts, so two renders are the same and nothing of
// theirs runs here. Three things are added, each for a fault seen when the first real page came out blank:
// - system fonts and no fades: in a capture with no window, web fonts and fade-ins never finish, and the text stays unseen;
// - a shift of the whole page, so the wanted section is at the top: the capture does not follow a scroll;
// - truth.js, so the judge knows where each line really is.
export const realPage = (name: string) => join(BUILD, "tmp", "real", name, "page.html");

const PAINTS = "<style>*{font-family:-apple-system,Helvetica,Arial,sans-serif !important;animation:none !important;transition:none !important}</style>";
const HEADROOM = 24;   // points left above the wanted section, so its heading is not cut by the window's edge

const shift = (id: string) => `<script>addEventListener("load", () => {
  const place = document.getElementById(${JSON.stringify(id)});
  if (place) document.documentElement.style.marginTop = -(place.getBoundingClientRect().top + scrollY - ${HEADROOM}) + "px";
});</script>`;

export async function fetchReal(name: string, url: string, at?: string): Promise<string> {
  const saved = realPage(name);
  if (existsSync(saved)) return saved;
  const dir = join(BUILD, "tmp", "real", name);
  await mkdir(dir, { recursive: true });
  const original = join(dir, "page.orig.html");
  await run("curl", ["--silent", "--fail", "--location", "--max-time", "30", "--user-agent", "Mozilla/5.0 (Macintosh)", "--output", original, url]);
  const html = (await readFile(original, "utf8")).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  if (!/<head[^>]*>/i.test(html) || !/<\/head>/i.test(html) || !/<\/body>/i.test(html)) throw new Error(`${url} is not a page with a head and a body`);
  const truth = `<script src="${pathToFileURL(join(EXAM, "pages", "truth.js")).href}"></script>`;
  await writeFile(saved, html.replace(/<head[^>]*>/i, (head) => `${head}<base href="${url}">`).replace(/<\/head>/i, `${PAINTS}</head>`)
    .replace(/<\/body>/i, `${at ? shift(at.replace(/^#/, "")) : ""}${truth}</body>`));
  return saved;
}
