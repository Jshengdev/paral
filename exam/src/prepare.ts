import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { silence, speak } from "./ask.ts";
import { renderPage } from "./page.ts";
import { existsSync } from "node:fs";
import { fetchReal, realPage } from "./real.ts";
import { Flow, Scenario, findNamed, type Display } from "./shape.ts";
import { EXAM, RUNS } from "./tools.ts";
import { circling } from "./trail.ts";

// His own screens are a 1728 by 1117 point MacBook at scale 2 and a 1920 by 1080 monitor. The exam uses the first.
const DISPLAY: Display = { id: 1, scale: 2, x: 0, y: 0, w: 1728, h: 1117 };
const SILENT_ASK_MS = 1500;
const LONGEST_TRAIL_MS = 4000;
const LOOK_WAIT_MS = 9000;   // a look showed its line 4 to 6 s after the page appeared (the builder's runs, 2026-11-14); a look ends in no line of its own, so the step waits

export async function scenarios(only?: string): Promise<Scenario[]> {
  const files = (await readdir(join(EXAM, "scenarios"))).filter((name) => name.endsWith(".json")).sort();
  const all = await Promise.all(files.map(async (name) => Scenario.parse(JSON.parse(await readFile(join(EXAM, "scenarios", name), "utf8")))));
  const chosen = only ? all.filter((s) => s.id === only) : all;
  if (chosen.length === 0) throw new Error(`no scenario is named "${only}"`);
  return chosen;
}

export const runDir = (id: string) => join(RUNS, id);

export async function prepare(scenario: Scenario): Promise<string> {
  const dir = runDir(scenario.id);
  await mkdir(dir, { recursive: true });
  const png = join(dir, "page.png");
  if (scenario.source) await fetchReal(scenario.page.slice(5), scenario.source.url, scenario.source.at, scenario.source.hide);
  for (const [name, other] of Object.entries(scenario.others ?? {})) await fetchReal(name, other.url, other.at, other.hide);
  const first = await renderPage(scenario.page, DISPLAY, png);
  let truth = first;
  let pages = 0;
  const boxOf = (name: string) => {
    const found = findNamed(truth, name);
    if (!found) throw new Error(`${scenario.id}: the page "${scenario.page}" has nothing named "${name}"`);
    return found.box;
  };
  const asks: Flow["asks"] = [];
  for (const [index, step] of scenario.steps.entries()) {
    if ("close" in step) {
      asks.push({ close: true });
      continue;
    }
    // Another page on the screen from this step on (he scrolled, or opened a section): its picture and what is on it
    // are kept beside the first page's, numbered.
    let other: string | undefined;
    if (step.page) {
      if (step.page.startsWith("real:") && !existsSync(realPage(step.page.slice(5)))) throw new Error(`${scenario.id}: "${step.page}" is not saved yet; prepare the scenario that fetches it first`);
      pages += 1;
      other = join(dir, `page-${pages}.png`);
      truth = await renderPage(step.page, DISPLAY, other);
      await writeFile(join(dir, `truth-${pages}.json`), JSON.stringify(truth, null, 2));
    }
    if ("look" in step) {
      asks.push({ look: true, waitMs: step.waitMs ?? LOOK_WAIT_MS, ...(other ? { page: other } : {}) });
      continue;
    }
    const wav = join(dir, `ask-${index + 1}.wav`);
    const lastsMs = step.say === "" ? await silence(SILENT_ASK_MS, wav) : await speak(step.say, wav);
    const trail = step.circle === null ? [] : circling(boxOf(step.circle), Math.min(lastsMs, LONGEST_TRAIL_MS));
    const startAfter = step.pressAgainAfterMs ? { releasePlusMs: step.pressAgainAfterMs }
      : step.cutInAnswerAfterMs ? { firstAnswerPlusMs: step.cutInAnswerAfterMs }
      : step.cutInAfterMs ? { firstSayPlusMs: step.cutInAfterMs } : "idle";
    asks.push({ wav, trail, startAfter, ...(other ? { page: other } : {}) });
  }
  const flow = Flow.parse({ v: 1, display: DISPLAY, page: png, fault: scenario.fault, asks });
  await writeFile(join(dir, "truth.json"), JSON.stringify(first, null, 2));
  await writeFile(join(dir, "flow.json"), JSON.stringify(flow, null, 2));
  return dir;
}
