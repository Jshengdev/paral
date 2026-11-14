import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BUILD, EXAM, run } from "./tools.ts";

// A real, public page, kept under tmp/ so it is never committed: it belongs to its publisher. The saved copy keeps
// the page's own styles (through a base address), drops its scripts so two renders are the same and nothing of
// theirs runs here, and loads truth.js so the judge knows where each line really is.
export const realPage = (name: string) => join(BUILD, "tmp", "real", name, "page.html");

export async function fetchReal(name: string, url: string): Promise<string> {
  const saved = realPage(name);
  if (existsSync(saved)) return saved;
  const dir = join(BUILD, "tmp", "real", name);
  await mkdir(dir, { recursive: true });
  const original = join(dir, "page.orig.html");
  await run("curl", ["--silent", "--fail", "--location", "--max-time", "30", "--user-agent", "Mozilla/5.0 (Macintosh)", "--output", original, url]);
  const html = (await readFile(original, "utf8")).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const truth = `<script src="${pathToFileURL(join(EXAM, "pages", "truth.js")).href}"></script>`;
  if (!/<head[^>]*>/i.test(html) || !/<\/body>/i.test(html)) throw new Error(`${url} is not a page with a head and a body`);
  await writeFile(saved, html.replace(/<head[^>]*>/i, (head) => `${head}<base href="${url}">`).replace(/<\/body>/i, `${truth}</body>`));
  return saved;
}
