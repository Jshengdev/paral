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
