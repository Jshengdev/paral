import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { Box } from "./shape.ts";
import type { Moment } from "./timeline.ts";

// The one place in the exam that knows the seam's own names. A run's record becomes moments in the exam's words.
const Recorded = z.object({ at: z.number(), from: z.enum(["body", "mind"]), line: z.object({ type: z.string() }).loose() });
const Placed = z.object({ at: z.number(), what: z.string(), id: z.string().optional(), look: z.string().optional(), box: Box });
export type Placed = z.infer<typeof Placed>;

const VOICE_RATE = 24_000;
const voiceMs = (pcm: string) => ((pcm.length * 3) / 4 / 2 / VOICE_RATE) * 1000;
const sayId = (line: Record<string, unknown>) => `${String(line.id)}:${String(line.beat)}`;

function moment(at: number, line: Record<string, unknown> & { type: string }): Moment | null {
  switch (line.type) {
    case "key.down": return { at, kind: "key-down" };
    case "key.up": return { at, kind: "key-up" };
    case "heard": return { at, kind: "heard", text: String(line.text) };
    case "trail": return { at, kind: "trail", x: Number(line.x), y: Number(line.y) };
    case "state": return { at, kind: "look", name: String(line.name), detail: line.detail === undefined ? undefined : String(line.detail) };
    case "mute": return { at, kind: "look", name: "voice down", detail: String(line.why) };
    case "say": return { at, kind: "say", id: sayId(line), text: String(line.text), opener: line.aside === true || Number(line.beat) < 0, hint: line.rung !== undefined, top: line.rung !== undefined && Number(line.rung) === Number(line.of) - 1, trail: Array.isArray(line.trail) ? line.trail.map(String) : undefined };
    case "voice": return { at, kind: "voice", of: sayId(line), ms: voiceMs(String(line.pcm)) };
    case "words": return { at, kind: "voiced", of: sayId(line), words: (line.words as string[]).map(String) };
    case "mark": return { at, kind: "mark", id: sayId(line), mark: String(line.kind), box: Box.parse(line.box), label: line.label === undefined ? undefined : String(line.label) };
    case "echo": return { at, kind: "echo", box: Box.parse(line.box) };
    case "board": return { at, kind: "board", text: (line.rows as string[][]).map((row) => row.join(" → ")).join(" | ") };
    case "clip": return { at, kind: "clip", path: String(line.clip), seconds: Number(line.seconds) };
    case "screen": {
      const lines = line.lines as { text: string }[];
      return { at, kind: "picture", path: (line.picture as { path: string }).path, lines: lines.length, unread: lines.filter((read) => read.text === "").length };
    }
    case "look": return { at, kind: "glance", lines: (line.lines as unknown[]).length };
    case "board.close": return { at, kind: "board-closed" };
    case "clear": return { at, kind: "clear" };
    case "close": return { at, kind: "close" };
    default: return null;
  }
}

async function lines<S extends z.ZodType>(file: string, shape: S): Promise<z.infer<S>[]> {
  const text = await readFile(file, "utf8");
  return text.split("\n").filter((line) => line.trim() !== "").map((line, index) => {
    const parsed = shape.safeParse(JSON.parse(line));
    if (!parsed.success) throw new Error(`${file} line ${index + 1}: ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`);
    return parsed.data;
  });
}

// The body stamps each line with its own clock. It sends the release a little late, after a short grace for the
// ear, and stamps it with the moment his finger lifted. He counts from that moment, so the judge does too: the
// stamp is carried over to the record's clock with the gap seen on the last line the body sent at once.
export async function moments(dir: string): Promise<Moment[]> {
  const recorded = await lines(join(dir, "session.jsonl"), Recorded);
  let ahead: number | null = null;
  const out = recorded.map((r) => {
    const stamp = typeof r.line.at === "number" ? r.line.at : null;
    if (r.line.type === "key.up" && stamp !== null && ahead !== null) return moment(stamp + ahead, r.line);
    if (r.from === "body" && stamp !== null) ahead = r.at - stamp;
    return moment(r.at, r.line);
  });
  return out.filter((m): m is Moment => m !== null).sort((a, b) => a.at - b.at);
}

// Where the painter says it put each thing, written by the film. The seam does not carry these: the body decides them.
export async function placed(dir: string): Promise<Placed[]> {
  const file = join(dir, "drawn.jsonl");
  return existsSync(file) ? lines(file, Placed) : [];
}
