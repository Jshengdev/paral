// The runner for turn rows: the real mind on a tape, lines in over a socket and lines out.
import { readFileSync } from "node:fs";
import { connect } from "node:net";
import { basename, join } from "node:path";
import { tape } from "../../mind/adapters/tape.ts";
import { serve } from "../../mind/server.ts";
import { settings } from "../../mind/settings.ts";
import { fresh } from "./temp.ts";

type Step = { until?: string; release?: boolean | string; say?: string } & Record<string, unknown>;

const shorter = (line: any) =>
  line.type === "voice"
    ? { v: line.v, type: line.type, id: line.id, beat: line.beat, bytes: Buffer.from(line.pcm, "base64").length, ...(line.last ? { last: true } : {}) }
    : line.type === "words"
      ? { v: line.v, type: line.type, id: line.id, beat: line.beat, count: line.words.length, ends: Number(line.end.at(-1).toFixed(2)) }
      : line.type === "open"
        ? // The file sits in this machine's temporary folder, so a row holds its name and what is in it.
          { v: line.v, type: line.type, id: line.id, file: basename(line.path), holds: readFileSync(line.path, "utf8") }
        : line;

export async function playTurn(input: { tape: string; asks: Step[][]; set?: Record<string, unknown>; show?: "drawn" | "saidFirst" | "ahead" }): Promise<unknown> {
  const path = fresh("row") + ".sock";
  const played = tape(join(import.meta.dirname, "..", "tapes", input.tape));
  const changed: any = { ...settings };
  for (const [name, value] of Object.entries(input.set ?? {})) changed[name] = { ...changed[name], value };
  const server = await serve(path, played, changed, () => {});
  const socket = connect(path);
  const got: any[] = [];
  let pending = "";
  let cursor = 0;
  let waiting: { ok: (line: any) => boolean; done: () => void } | null = null;
  const scan = () => {
    while (waiting && cursor < got.length) {
      if (waiting.ok(got[cursor++])) {
        const { done } = waiting;
        waiting = null;
        done();
      }
    }
  };
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    pending += chunk;
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const text of lines) got.push(JSON.parse(text));
    scan();
  });
  const until = (ok: (line: any) => boolean, what: string) =>
    new Promise<void>((resolve, reject) => {
      const guard = setTimeout(() => reject(new Error(`the mind never sent ${what}`)), 5000);
      waiting = { ok, done: () => (clearTimeout(guard), resolve()) };
      scan();
    });
  const settled = (line: any) => line.type === "ready" || (line.type === "state" && ["idle", "failed"].includes(line.name));
  try {
    for (const ask of input.asks) {
      for (const step of ask) {
        if (step.until) await until((line) => line.type === step.until, `a "${step.until}" line`);
        else if (step.release) played.release(typeof step.release === "string" ? step.release : undefined);
        else if (step.say) socket.write(JSON.stringify({ v: 1, type: "mic", pcm: Buffer.from(step.say).toString("base64"), at: 0 }) + "\n");
        else socket.write(JSON.stringify(step) + "\n");
      }
      // A look he did not ask for ends in no state line; a group with one says itself what it waits for.
      if (!ask.some((step) => step.type === "look")) await until(settled, "a settled state");
    }
    if (input.show === "ahead") return played.asked.map((asked) => ({ words: asked.words, ahead: asked.ahead }));
    if (input.show === "drawn") return played.asked.map((asked) => ({ words: asked.words, drawn: asked.lesson.drawn }));
    if (input.show === "saidFirst") return { toldTheDeepModel: played.asked.map((asked) => ({ words: asked.words, saidFirst: asked.saidFirst })), said: got.filter((line) => line.type === "say").map((line) => ({ beat: line.beat, text: line.text })) };
    return got.map(shorter);
  } finally {
    socket.destroy();
    await server.stop();
  }
}
