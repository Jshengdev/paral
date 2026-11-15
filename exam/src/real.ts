import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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

// `hide` is what the page keeps hidden until he clicks: a closed section's inside. With the page's scripts gone its
// sections all stand open, so a scenario that needs one closed names what to hide, as the page's own style rule would.
/** The saved original of a page fetched from this address before, under any name; null when there is none. */
async function alreadyFetched(url: string): Promise<string | null> {
  const root = join(BUILD, "tmp", "real");
  if (!existsSync(root)) return null;
  for (const name of await readdir(root)) {
    const saved = join(root, name, "page.html");
    const original = join(root, name, "page.orig.html");
    if (existsSync(saved) && existsSync(original) && (await readFile(saved, "utf8")).includes(`<base href="${url}">`)) return original;
  }
  return null;
}

export async function fetchReal(name: string, url: string, at?: string, hide?: string): Promise<string> {
  const saved = realPage(name);
  if (existsSync(saved)) return saved;
  const dir = join(BUILD, "tmp", "real", name);
  await mkdir(dir, { recursive: true });
  const original = join(dir, "page.orig.html");
  // One fetch for each address: another view of a page already saved is made from that copy. It spares the
  // publisher, and a view can still be made when their site is failing (it answered 504 at 20:18 on 2026-11-14).
  const fetched = await alreadyFetched(url);
  if (fetched) await copyFile(fetched, original);
  else await run("curl", ["--silent", "--fail", "--location", "--max-time", "30", "--user-agent", "Mozilla/5.0 (Macintosh)", "--output", original, url]);
  // Scripts go, so two renders are the same. An embedded frame goes too: it is another site's page, whose own scripts
  // would run here, and it holds a video, not words on the page. A grey box of a video's shape stands in its place.
  const html = (await readFile(original, "utf8")).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '<div style="background:#d9dce1;aspect-ratio:16/9;max-width:100%"></div>');
  if (!/<head[^>]*>/i.test(html) || !/<\/head>/i.test(html) || !/<\/body>/i.test(html)) throw new Error(`${url} is not a page with a head and a body`);
  const truth = `<script src="${pathToFileURL(join(EXAM, "pages", "truth.js")).href}"></script>`;
  await writeFile(saved, html.replace(/<head[^>]*>/i, (head) => `${head}<base href="${url}">`).replace(/<\/head>/i, `${PAINTS}${hide ? `<style>${hide}{display:none !important}</style>` : ""}</head>`)
    .replace(/<\/body>/i, `${at ? shift(at.replace(/^#/, "")) : ""}${truth}</body>`));
  return saved;
}
