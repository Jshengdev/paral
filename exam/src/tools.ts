import { execFile } from "node:child_process";
import { join } from "node:path";

export const BUILD = join(import.meta.dirname, "..", "..");
export const EXAM = join(BUILD, "exam");
export const RUNS = join(BUILD, "tmp", "runs");

export function run(command: string, args: string[], limitMs = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: limitMs, maxBuffer: 64 * 1024 * 1024, encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${command} failed: ${stderr.trim().split("\n").at(-1) || error.message}`));
      else resolve(stdout);
    });
  });
}

/** The app's code as it stands in this folder: the newest commit that touched it, as "hash (subject)". The judge's own commits do not count. */
export async function appCommit(): Promise<string | null> {
  try { return (await run("git", ["-C", BUILD, "log", "-1", "--format=%h (%s)", "--", "mind", "body", "seam", "flow", "film", "run", "pages"])).trim() || null; } catch { return null; }
}
