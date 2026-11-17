// The runner for turn rows: the real mind on a tape, lines in over a socket and lines out.
import { readFileSync } from "node:fs";
import { connect } from "node:net";
import { basename, join } from "node:path";
import { tape } from "../../mind/adapters/tape.ts";
import { serve } from "../../mind/server.ts";
import { settings } from "../../mind/settings.ts";
import { fresh } from "./temp.ts";

/** A page's words as he reads them, a line for each block: no style, no script, no tags. */
const read = (html: string) => html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<\/(p|li|h1|h2|blockquote|span)>|<br>/g, "\n").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").split("\n").map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);

type Step = { until?: string; release?: boolean | string; say?: string } & Record<string, unknown>;

/** A line as a row holds it: sound and word timings by their size, a calendar file by what is in it. */
function shorter(line: any) {
  const { v, type, id, beat } = line;
  // The cue cards and the opening line are settings, the same in every row, so the ready line is held without them; they have a row of their own.
  if (type === "ready") return (({ cues: _cues, opening: _opening, ...rest }) => rest)(line);
  if (type === "voice") return { v, type, id, beat, bytes: Buffer.from(line.pcm, "base64").length, ...(line.last ? { last: true } : {}) };
  if (type === "words") return { v, type, id, beat, count: line.words.length, ends: Number(line.end.at(-1).toFixed(2)) };
  // A dim line is stamped with the clock's own time, which no row can hold: its words and what its draft had heard are held.
  if (type === "thought") return { v, type, text: line.text, heard: line.heard };
  // The file sits in this machine's temporary folder, so a row holds its name and what is in it. The notes page is
  // held as he reads it: its words a line each, and the pictures it shows.
  if (type === "open" && line.path.endsWith(".html")) return { v, type, id, file: basename(line.path), label: line.label, reads: read(readFileSync(line.path, "utf8")), pictures: [...readFileSync(line.path, "utf8").matchAll(/<img class="thumb" src="([^"]+)"/g)].map((m) => m[1]) };
  if (type === "open") return { v, type, id, file: basename(line.path), holds: readFileSync(line.path, "utf8") };
  return line;
}

export async function playTurn(input: { tape: string; tapeSet?: Record<string, unknown>; asks: Step[][]; set?: Record<string, unknown>; show?: "drawn" | "saidFirst" | "ahead" | "next" | "cuts" | "walk" | "whole" | "column" | "written" }): Promise<unknown> {
  const path = fresh("row") + ".sock";
  const played = tape(join(import.meta.dirname, "..", "tapes", input.tape), input.tapeSet);
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
        else socket.write(JSON.stringify(step.at === "now" ? { ...step, at: Date.now() } : step) + "\n");
      }
      // A look he did not ask for, and a click, end in no state line; a group with one says itself what it waits for,
      // unless it also holds an ask, which settles like any other.
      const asks = ask.some((step) => step.type === "key.up" || step.type === "typed");
      if (asks || !ask.some((step) => step.type === "look" || step.type === "click")) await until(settled, "a settled state");
    }
    if (input.show === "ahead") return played.asked.map((asked) => ({ words: asked.words, ahead: asked.ahead }));
    // What the cutting port was asked, with the file it was to write by its name only: it sits in this machine's temporary folder.
    if (input.show === "cuts") return { cuts: played.cuts.map((job) => ({ ...job, to: basename(job.to) })), opened: got.filter((line) => line.type === "open").map(shorter).map(({ holds: _holds, ...rest }) => rest), said: got.filter((line) => line.type === "say" && /^t/.test(line.id)).map((line) => `${line.id}: ${line.text}`) };
    // What the deep model was asked for each ask, as the work-through sees it, and every line that went out.
    if (input.show === "walk") return { asked: played.asked.map((asked) => ({ words: asked.words, walk: asked.walk ?? null, spots: asked.spots.length, shown: asked.lesson.shown })), lines: got.filter((line) => line.type !== "next").map(shorter) };
    // Whether the deep model was asked for the whole thing drawn, for each ask, and the boards and sentences that went out.
    if (input.show === "whole") return { asked: played.asked.map((asked) => ({ words: asked.words, whole: asked.whole ?? false, full: asked.full ?? false })), lines: got.filter((line) => ["board", "say", "board.close"].includes(line.type)).map(({ v: _v, ...rest }) => rest), drawn: played.asked.at(-1)?.lesson.drawn };
    // Whether the deep model was asked for a drawing of what was just said, for each ask, and the boards and sentences that went out.
    if (input.show === "column") return { asked: played.asked.map((asked) => ({ words: asked.words, column: asked.column ?? false, full: asked.full ?? false })), lines: got.filter((line) => ["board", "say", "board.close"].includes(line.type)).map(({ v: _v, ...rest }) => rest) };
    // Whether the deep model was told he asked to be shown what a thing would look like, for each ask, and the boards and sentences that went out.
    if (input.show === "written") return { asked: played.asked.map((asked) => ({ words: asked.words, written: asked.written ?? false })), lines: got.filter((line) => ["board", "say", "board.close"].includes(line.type)).map(({ v: _v, ...rest }) => rest) };
    if (input.show === "drawn") return played.asked.map((asked) => ({ words: asked.words, drawn: asked.lesson.drawn }));
    if (input.show === "saidFirst") return { toldTheDeepModel: played.asked.map((asked) => ({ words: asked.words, saidFirst: asked.saidFirst })), said: got.filter((line) => line.type === "say").map((line) => ({ beat: line.beat, text: line.text })) };
    // The guide's lines are a setting's doing and would sit in every row that looks at a kept page; one row shows them.
    if (input.show === "next") return got.filter((line) => line.type === "next").map(({ v: _v, type: _type, ...rest }) => rest);
    return got.filter((line) => line.type !== "next").map(shorter);
  } finally {
    socket.destroy();
    await server.stop();
  }
}
