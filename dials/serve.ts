// The dials page's server: it serves the page, reads and saves the look (body/tokens.json), and draws one frame of a
// recorded run with the real painter so a change can be seen. It listens on this Mac only.
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";

const here = import.meta.dirname;
const root = join(here, "..");
const tokensPath = join(root, "body", "tokens.json");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const port = Number(process.env.PARAL_DIALS_PORT ?? 4173);
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

/** Recorded runs that can be looked at: any folder under tmp/dev or tmp/runs that holds flow.json and session.jsonl. */
function runs(): string[] {
  return ["dev", "runs"].flatMap((kind) => {
    const dir = join(root, "tmp", kind);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => existsSync(join(dir, name, "flow.json")) && existsSync(join(dir, name, "session.jsonl")))
      .map((name) => `${kind}/${name}`);
  });
}

/** Why a new look is refused, or null when it may be saved: it must have the same keys as the one on disk, each the same kind of value. */
function refusal(now: unknown, onDisk: unknown, path = "tokens"): string | null {
  if (typeof now !== typeof onDisk || now === null) return `${path}: expected a ${typeof onDisk}`;
  if (typeof onDisk === "number" && !Number.isFinite(now)) return `${path}: not a number`;
  if (typeof onDisk === "string" && /^#/.test(onDisk) && !/^#[0-9a-fA-F]{6}$/.test(now as string)) return `${path}: a colour is six hex digits, like #FF4D1C`;
  if (typeof onDisk !== "object") return null;
  const keys = Object.keys(onDisk as object);
  const extra = Object.keys(now as object).find((key) => !keys.includes(key));
  if (extra) return `${path}.${extra}: not a token`;
  for (const key of keys) {
    const why = refusal((now as Record<string, unknown>)[key], (onDisk as Record<string, unknown>)[key], `${path}.${key}`);
    if (why) return why;
  }
  return null;
}

const send = (res: ServerResponse, code: number, type: string, body: string | Buffer, more: Record<string, string> = {}) => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store", ...more });
  res.end(body);
};
const say = (res: ServerResponse, code: number, value: unknown) => send(res, code, "application/json", JSON.stringify(value));

let frames = 0;

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/api/tokens" && req.method === "GET") return send(res, 200, "application/json", readFileSync(tokensPath));
  if (url.pathname === "/api/tokens" && req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const now = JSON.parse(body);
        const why = refusal(now, JSON.parse(readFileSync(tokensPath, "utf8")));
        if (why) return say(res, 400, { why });
        writeFileSync(tokensPath, JSON.stringify(now, null, 2) + "\n");
        say(res, 200, { saved: tokensPath });
      } catch (error) {
        say(res, 400, { why: `not JSON (${(error as Error).message})` });
      }
    });
    return;
  }
  if (url.pathname === "/api/runs") return say(res, 200, runs());
  if (url.pathname === "/api/frame") {
    const run = url.searchParams.get("run") ?? "";
    const moment = Number(url.searchParams.get("t"));
    if (!runs().includes(run) || !Number.isFinite(moment)) return say(res, 400, { why: "that run is not one of the recorded runs" });
    if (!existsSync(headless)) return say(res, 500, { why: "the body is not built; run ./check once" });
    const out = join(tmpdir(), `paral-dials-${process.pid}-${++frames % 8}.png`);
    execFile(headless, ["frame", join(root, "tmp", run), tokensPath, String(Math.max(0, moment)), out], (error, stdout, stderr) => {
      if (error) return say(res, 500, { why: stderr.trim() || error.message });
      send(res, 200, "image/png", readFileSync(out), { "X-End": String(JSON.parse(stdout).end) });
    });
    return;
  }
  const file = normalize(join(here, url.pathname === "/" ? "index.html" : url.pathname));
  if (!file.startsWith(here) || !existsSync(file) || !types[extname(file)]) return say(res, 404, { why: "no such page" });
  send(res, 200, types[extname(file)], readFileSync(file));
}).listen(port, "127.0.0.1", () => {
  console.log(`dials: open http://127.0.0.1:${port} in a browser. Changes are saved to body/tokens.json. Ctrl-C stops it.`);
  if (runs().length === 0) console.log("dials: no recorded run to look at yet. Make one with ./flow (see README.md), then reload the page.");
});
