import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { BUILD } from "./tools.ts";

// Where paral stands beside Roamies and pickje2, measured from the tree each time it runs. It is not the product, so
// it is written to the side lane (../side/), not into this folder. The other two columns are
// fixed readings with their dates. The table is rewritten; the log under it only grows, so the standing has a history.
const CODE = [".ts", ".tsx", ".swift"];
const SKIP = new Set(["node_modules", ".build", "vendor", "tmp", "tapes", "rows"]);
const LOG = "## The log";

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (CODE.some((end) => entry.name.endsWith(end))) out.push(path);
  }
  return out;
}

const count = async (dir: string, end: string) => (existsSync(dir) ? (await readdir(dir)).filter((name) => name.endsWith(end)).length : 0);
const grepCount = async (file: string, pattern: RegExp) => (existsSync(file) ? ((await readFile(file, "utf8")).match(pattern) ?? []).length : 0);

export async function stand(note: string): Promise<string> {
  const files = (await Promise.all(["mind", "body/Sources", "seam", "test", "exam", "lessons"].map((d) => walk(join(BUILD, d))))).flat();
  const sizes = await Promise.all(files.map(async (file) => ({ file: relative(BUILD, file), lines: (await readFile(file, "utf8")).split("\n").length - 1 })));
  sizes.sort((a, b) => b.lines - a.lines);
  const lines = sizes.reduce((sum, s) => sum + s.lines, 0);
  const over = (n: number) => sizes.filter((s) => s.lines > n).length;
  const rows = await count(join(BUILD, "test", "rows"), ".json");
  const scenarios = await count(join(BUILD, "exam", "scenarios"), ".json");
  const ports = await grepCount(join(BUILD, "mind", "ports.ts"), /^export interface /gm);
  const seamLines = await grepCount(join(BUILD, "seam", "schema.ts"), /type: z\.literal\(/g);
  const deps = Object.keys(JSON.parse(await readFile(join(BUILD, "package.json"), "utf8")).dependencies ?? {});
  const biggest = sizes[0];
  const table = [
    "| | Roamies | paral, now | pickje2 |",
    "|---|---|---|---|",
    `| Code | 133 files, 39,201 lines | ${sizes.length} files, ${lines.toLocaleString("en-US")} lines | 343 files, 36,306 lines |`,
    `| Largest file | 2,233 lines: the turn, prompts, settings, sign-ins, menu and the wire, in one | ${biggest.lines} lines: \`${biggest.file}\` | 808 lines |`,
    `| Files over 300 lines | at least 8, each over 1,000 | ${over(300)} (over 150: ${over(150)}) | not counted |`,
    "| Languages and processes | four runtimes, three languages | two processes, two languages | two processes, two languages |",
    `| The wire between processes | newline JSON, no schema, no version; unknown lines are dropped silently | one schema with a version, ${seamLines} line types, checked in and out; a bad line is refused with its field named | one schema per wire, versioned |`,
    `| Outside services | one file per speech service; the model sits behind a framework | ${ports} ports, each with a live adapter and a tape | 17 ports |`,
    "| Where the live state is | 44 top-level variables in the largest file | inside one turn per connection; the cores keep none | inside the turn and the session |",
    `| Checks | 40 test scripts, 1,859 asserts, no whole-turn test, no linter | ${rows} rows from one command, and ${scenarios} scenarios for the outside judge, each filmed when it runs | 649 rows from one command |`,
    `| Libraries it runs on | six in the brain, plus the shell's | ${deps.length}: ${deps.join(", ")} | three |`,
    "| Stopping work | a stop does not reach a running hands plan (an inference from its source) | every model call takes a stop signal, and each ask owns its own | every call can be cancelled |",
  ].join("\n");
  const head = [
    "# How paral stands",
    "",
    "A side-by-side of architecture and code cleanliness, kept as a way to keep track.",
    "",
    "- **Roamies** is read from its open source at commit dca8663 (the study's trace, sections 4 to 6, 2026-11-13). It was not run.",
    "- **pickje2** is its main branch at 1a63fbf, counted on 2026-11-14.",
    "- **paral** is counted from this tree each time `node exam/run.ts stand` runs. Counts cover mind, body, seam, test, exam and lessons.",
    "- Smaller is not better by itself. Roamies does far more: three systems, hands, background agents, a creature.",
    "",
    table,
    "",
    "What the table does not show, in a line each (the judge's read):",
    "- Roamies' strength is breadth and warmth: parts kept ready before he speaks, and a body that feels alive.",
    "- Its cost is the one large file that owns the state and the untyped wire.",
    "- paral's strength so far is the seam and the cores: each piece runs alone. Its risk is being thin: few real pages, and no real window yet.",
    "",
    LOG,
    "",
    "| When | Files | Lines | Largest | Rows | Note |",
    "|---|---|---|---|---|---|",
  ].join("\n");
  const file = join(BUILD, "..", "side", "paral-standing.md");
  const old = existsSync(file) ? await readFile(file, "utf8") : "";
  const kept = old.includes(LOG) ? old.slice(old.indexOf(LOG)).split("\n").filter((line) => /^\| \d{4}-/.test(line)) : [];
  const when = new Date().toLocaleString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 16);
  kept.push(`| ${when} | ${sizes.length} | ${lines} | ${biggest.lines} | ${rows} | ${note} |`);
  await writeFile(file, `${head}\n${kept.join("\n")}\n`);
  return file;
}
