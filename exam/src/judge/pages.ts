import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { BUILD } from "../tools.ts";

// What the build read besides his screen. Its pages are read ahead of time and kept as text in pages/kept/, one file
// a page, and for each ask the mind's log names the ones it gave the model (the builder's record, 2026-11-14, 19:12):
//   t1: his screen is the kept page "TITLE" (URL, read DAY); given with it: URL, URL
// The judge takes the lines of exactly those files, so a date counts as read only when the page that holds it was
// given with that ask. The kept text is the builder's reading of each page; the judge does not check it against the
// site.
const Kept = z.object({ url: z.string().min(1), title: z.string(), lines: z.array(z.string()) });
const GIVEN = / (t\d+): his screen is the kept page "(.*)" \((\S+), read [^)]*\); given with it: (.*)$/;
// A look he did not ask for names the one page the model was asked about, by its title:
//   g1: an unasked look: his screen is the kept page "TITLE". Nothing read from his screen leaves the Mac for it: ...
const LOOKED = / (g\d+): an unasked look: his screen is the kept page "(.*)"\. Nothing read from his screen/;

export type PageRead = z.infer<typeof Kept>;

/** For each ask's id ("t1"), the kept pages its answer was given, the one on his screen first; for a look's id ("g1"), the one page asked about. */
export async function pagesGiven(dir: string): Promise<Map<string, PageRead[]>> {
  const log = join(dir, "mind.log");
  const keptDir = join(BUILD, "pages", "kept");
  const given = new Map<string, PageRead[]>();
  if (!existsSync(log) || !existsSync(keptDir)) return given;
  const files = (await readdir(keptDir)).filter((name) => name.endsWith(".json"));
  const kept = await Promise.all(files.map(async (name) => Kept.parse(JSON.parse(await readFile(join(keptDir, name), "utf8")))));
  for (const line of (await readFile(log, "utf8")).split("\n")) {
    const looked = LOOKED.exec(line);
    if (looked) {
      const page = kept.find((one) => one.title === looked[2]);
      if (!page) throw new Error(`the mind's log names "${looked[2]}" as the page of a look, and pages/kept holds no page of that title`);
      given.set(looked[1], [page]);
    }
    const found = GIVEN.exec(line);
    if (!found) continue;
    const urls = [found[3], ...found[4].split(", ").filter((url) => url.startsWith("http"))];
    given.set(found[1], urls.map((url) => {
      const page = kept.find((one) => one.url === url);
      if (!page) throw new Error(`the mind's log names ${url} as a page it gave, and pages/kept holds no such page`);
      return page;
    }));
  }
  return given;
}
