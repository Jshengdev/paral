import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isLesson, LESSONS } from "./shape.ts";

const HERE = import.meta.dirname;
const OUT = join(HERE, "..", "tmp", "lessons");
const RENDER_LIMIT_MS = 120_000; // a full clip took 17 s on this Mac (2026-11-14, one run); far past that, it is stuck

export type Rendered = { clip: string; still: string; cached: boolean };

function raea(args: string[], cwd: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("raea", args, { cwd, timeout: RENDER_LIMIT_MS, signal }, (error, _out, stderr) =>
      error ? reject(new Error(`raea ${args[0]} failed: ${stderr.trim().split("\n").at(-1) || error.message}`)) : resolve());
  });
}

// Render one lesson to a clip and a first still. The same data gives the same folder, so a lesson is rendered once.
export async function render(name: string, data: unknown, signal?: AbortSignal): Promise<Rendered> {
  if (!isLesson(name)) throw new Error(`no lesson is named "${name}"`);
  const checked = LESSONS[name].parse(data);
  const key = createHash("sha256").update(JSON.stringify([name, checked])).digest("hex").slice(0, 12);
  const dir = join(OUT, `${name}-${key}`);
  const clip = join(dir, `${name}.mp4`);
  const still = join(dir, "still.png");
  if (existsSync(clip) && existsSync(still)) return { clip, still, cached: true };
  await mkdir(dir, { recursive: true });
  await cp(join(HERE, `${name}.tsx`), join(dir, `${name}.tsx`));
  await writeFile(join(dir, "lesson.gen.ts"), `export default ${JSON.stringify(checked, null, 2)};\n`);
  await raea(["render", `${name}.tsx`, "--frame", "30", "-o", "still.png"], dir, signal);
  await raea(["render", `${name}.tsx`, "-o", `${name}.mp4`], dir, signal);
  return { clip, still, cached: false };
}

if (process.argv[1] === import.meta.filename) {
  const [name, json] = process.argv.slice(2);
  if (!name || !json) {
    console.error(`usage: node lessons/render.ts <${Object.keys(LESSONS).join(" | ")}> '<json data>'`);
    process.exit(2);
  }
  const started = Date.now();
  const out = await render(name, JSON.parse(json));
  console.log(`${out.clip} (${out.cached ? "already rendered" : `rendered in ${Date.now() - started} ms`})`);
}
