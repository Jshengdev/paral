import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CRITERIA, NOT_LIVE, WAITING } from "./criteria.ts";
import { explain, type Judged } from "./src/explain.ts";
import { sheet } from "./src/film.ts";
import { judge } from "./src/judge.ts";
import { planted } from "./src/planted.ts";
import { prepare, runDir, scenarios } from "./src/prepare.ts";

const [command, only, from, every] = process.argv.slice(2);

const line = (j: Judged) => {
  const count = (pass: boolean | null) => j.verdicts.filter((v) => v.pass === pass).length;
  return `${j.scenario.id}: ${count(true)} pass, ${count(false)} fail, ${count(null)} not shown`;
};

const commands: Record<string, () => Promise<void>> = {
  // Make each scenario's page picture, its true boxes, its asks as sound, and the flow file the app's ./flow reads.
  async prepare() {
    for (const scenario of await scenarios(only)) console.log(`prepared ${scenario.id}: ${join(await prepare(scenario), "flow.json")}`);
  },
  // Judge each run that has a record, make its film from the frames, and print one line per scenario.
  async judge() {
    for (const scenario of await scenarios(only)) {
      if (!existsSync(join(runDir(scenario.id), "session.jsonl"))) {
        console.log(`${scenario.id}: no run yet`);
        continue;
      }
      const judged = await judge(scenario);
      console.log(line(judged));
      for (const v of judged.verdicts.filter((v) => v.pass === false)) console.log(`  fails ${v.criterion}: ${v.what} (${v.measured})`);
    }
  },
  // Twelve frames on one sheet for judging by eye: sheet <scenario> <from ms> <every ms>.
  async sheet() {
    if (!only) throw new Error("sheet needs a scenario");
    console.log(await sheet(runDir(only), Number(from ?? 0), Number(every ?? 500), `sheet-${from ?? 0}`));
  },
  // The judge's own test: made-up asks with one fault planted in each. A check that cannot fail proves nothing.
  async planted() {
    const cases = await planted();
    for (const c of cases) console.log(`${c.ok ? "ok  " : "BAD "} ${c.name}: ${c.why}`);
    const bad = cases.filter((c) => !c.ok).length;
    console.log(`${cases.length - bad} of ${cases.length} planted cases behave as they must`);
    if (bad > 0) process.exitCode = 1;
  },
  // One page of what works, from the verdicts already written.
  async explain() {
    const judged: Judged[] = [];
    for (const scenario of await scenarios()) {
      const file = join(runDir(scenario.id), "verdicts.json");
      if (existsSync(file)) judged.push(JSON.parse(await readFile(file, "utf8")));
    }
    console.log(`explainer: ${await explain(judged, CRITERIA, NOT_LIVE, WAITING)}`);
  },
};

const chosen = commands[command ?? ""];
if (!chosen) {
  console.error(`usage: node exam/run.ts <${Object.keys(commands).join(" | ")}> [scenario]`);
  process.exit(2);
}
await chosen();
