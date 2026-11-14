import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { EXAM } from "./tools.ts";
import { unseen, type Verdict } from "./verdict.ts";

// Some things only a reader can judge, such as whether a follow-up built on the answer before it. A reading is
// written by whoever read the run, in exam/readings/, and it names the run it read. A new run needs a new reading.
type Reading = { session: string; by: string; verdicts: Verdict[] };

export const sessionMark = async (dir: string) => createHash("sha256").update(await readFile(join(dir, "session.jsonl"))).digest("hex").slice(0, 12);

export async function readings(scenario: string, dir: string): Promise<Verdict[]> {
  const file = join(EXAM, "readings", `${scenario}.json`);
  if (!existsSync(file)) return [];
  const reading: Reading = JSON.parse(await readFile(file, "utf8"));
  if (reading.session === await sessionMark(dir)) return reading.verdicts.map((v) => ({ ...v, measured: `${v.measured} (read by ${reading.by})` }));
  return reading.verdicts.map((v) => unseen(v.criterion, v.step, v.what, "this run has not been read yet; the reading on file is of an earlier run"));
}
