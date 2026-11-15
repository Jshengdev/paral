import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { KeptPage } from "../cores/page.ts";
import type { Glanced, Glancer } from "../ports.ts";

type Log = (line: string) => void;

/**
 * A glancer that keeps what a page's first look found. That look is about the kept page's own text and today's date
 * and about nothing on his screen, so its answer is the same all day: it is asked once, kept on disk, and given at
 * once after that, also after a restart. A look after an ask depends on his question and is always asked live. A
 * kept look is named by everything that changes it (`stamp`: the model and the prompt), the page, the day the page
 * was read and today's date, so when any of them changes it is simply not found and is asked again.
 */
export function looked(live: Glancer, stamp: string, dir: string, log: Log): Glancer & { ahead(pages: KeptPage[], today: number, signal: AbortSignal): Promise<void> } {
  const day = (ms: number) => new Date(ms).toLocaleDateString("en-CA");
  const at = (page: KeptPage, today: number) =>
    join(dir, `${page.name}-${createHash("sha256").update(JSON.stringify([stamp, page.url, page.readOn, day(today)])).digest("hex").slice(0, 12)}.json`);
  /** The looks being asked now, so a look of the same page that comes meanwhile waits for the same answer. */
  const asking = new Map<string, Promise<Glanced | null>>();

  const first = (page: KeptPage, today: number, signal: AbortSignal): Promise<Glanced | null> => {
    const path = at(page, today);
    if (existsSync(path)) return Promise.resolve(JSON.parse(readFileSync(path, "utf8")) as Glanced | null);
    let asked = asking.get(path);
    if (asked === undefined) {
      asked = live
        .glance(page, today, signal)
        .then((found) => {
          mkdirSync(dir, { recursive: true });
          writeFileSync(path, JSON.stringify(found, null, 1) + "\n");
          return found;
        })
        .finally(() => asking.delete(path));
      asking.set(path, asked);
    }
    return asked;
  };

  return {
    glance: (page, today, signal, following) => (following ? live.glance(page, today, signal, following) : first(page, today, signal)),
    /** Asks ahead for every page not yet kept for today, one after another, so the first look at a page does not wait for the model. */
    async ahead(pages, today, signal) {
      for (const page of pages) {
        if (signal.aborted) return;
        if (existsSync(at(page, today))) continue;
        await first(page, today, signal).then(
          (found) => log(`look kept ahead for "${page.title}": ${found === null ? "nothing to show" : `"${found.line.slice(0, 60)}"`}`),
          (error) => signal.aborted || log(`the look for "${page.title}" could not be asked ahead (${error instanceof Error ? error.message : error}); it is asked when the page is seen`),
        );
      }
    },
  };
}
