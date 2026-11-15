import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { Truth, type Display } from "./shape.ts";
import { realPage } from "./real.ts";
import { EXAM } from "./tools.ts";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LIMIT_MS = 60_000; // a page is drawn in 1 to 4 s and a close that hangs gives up at about 14 s (measured 2026-11-14)

// What the browser wrote, and how it ended. Its work is the picture and the page's text, so those are what is checked,
// not its exit. On 2026-11-14 at 18:50 to 18:57, on a Mac whose load average was near 200, Chrome 157.0.8103.51 wrote
// both and then failed to close ("Teardown watchdog expired", exit 2) on every page, the exam's own included, with the
// network on or off; at 18:59 it closed cleanly in 1 s. The fault comes and goes, so a bad close is said and not fatal.
function browser(args: string[]): Promise<{ wrote: string; ended: string | null }> {
  return new Promise((resolve) => {
    execFile(CHROME, args, { timeout: LIMIT_MS, maxBuffer: 64 * 1024 * 1024, encoding: "utf8" }, (error, stdout, stderr) =>
      resolve({ wrote: stdout, ended: error ? stderr.trim().split("\n").at(-1) || error.message : null }));
  });
}

// `page` is one of the exam's own pages, or "real:NAME" for a saved public page.
export async function renderPage(page: string, display: Display, png: string): Promise<Truth[]> {
  const file = page.startsWith("real:") ? realPage(page.slice(5)) : join(EXAM, "pages", `${page}.html`);
  const url = pathToFileURL(file).href;
  const profile = await mkdtemp(join(tmpdir(), "paral-exam-chrome-"));
  // The time budget lets a real page's styles arrive before the picture is taken. It is the browser's own clock, not a wait.
  const shared = ["--headless=new", "--hide-scrollbars", "--no-first-run", "--virtual-time-budget=9000", `--user-data-dir=${profile}`,
    `--window-size=${display.w},${display.h}`, `--force-device-scale-factor=${display.scale}`];
  try {
    await rm(png, { force: true }); // an older picture must never stand in for this one
    const shot = await browser([...shared, `--screenshot=${png}`, url]);
    const drawn = await stat(png).then((s) => s.size > 0, () => false);
    if (!drawn) throw new Error(`Google Chrome drew no picture of ${page}: ${shot.ended ?? "it gave no reason"}`);
    const dom = await browser([...shared, "--dump-dom", url]);
    const found = /<pre id="truth" hidden="">([^<]*)<\/pre>/.exec(dom.wrote);
    if (!found) throw new Error(`${page} wrote no truth: ${dom.ended ?? "it must load truth.js"}`);
    const text = found[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
    const truth = z.array(Truth).min(1).parse(JSON.parse(text));
    const ended = shot.ended ?? dom.ended;
    if (ended) console.error(`the browser drew ${page} and read it, then did not close cleanly: ${ended}`);
    return truth;
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
