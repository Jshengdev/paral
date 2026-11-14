import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { Truth, type Display } from "./shape.ts";
import { realPage } from "./real.ts";
import { EXAM, run } from "./tools.ts";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// `page` is one of the exam's own pages, or "real:NAME" for a saved public page. `at` is a place on it to scroll to.
export async function renderPage(page: string, display: Display, png: string, at = ""): Promise<Truth[]> {
  const file = page.startsWith("real:") ? realPage(page.slice(5)) : join(EXAM, "pages", `${page}.html`);
  const url = pathToFileURL(file).href + at;
  const profile = await mkdtemp(join(tmpdir(), "paral-exam-chrome-"));
  const shared = ["--headless=new", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${profile}`,
    `--window-size=${display.w},${display.h}`, `--force-device-scale-factor=${display.scale}`];
  try {
    await run(CHROME, [...shared, `--screenshot=${png}`, url]);
    const dom = await run(CHROME, [...shared, "--dump-dom", url]);
    const found = /<pre id="truth" hidden="">([^<]*)<\/pre>/.exec(dom);
    if (!found) throw new Error(`${page}.html wrote no truth: it must load truth.js`);
    const text = found[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
    return z.array(Truth).min(1).parse(JSON.parse(text));
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
