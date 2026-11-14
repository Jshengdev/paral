// Runners for rows about adapters, with a stand-in where the outside service would be.
import { writeFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../../mind/adapters/anthropic.ts";
import { kept } from "../../mind/adapters/kept.ts";
import { empty, type Lesson } from "../../mind/cores/hold.ts";
import type { Asked, Spoken } from "../../mind/ports.ts";
import { settings } from "../../mind/settings.ts";
import { fresh } from "./temp.ts";

/** What a row gives the stand-in: what is asked, and what the model and the second look reply. */
type StandIn = {
  asked: Partial<Omit<Asked, "lesson">> & { lesson?: Partial<Lesson> };
  picture: boolean;
  brainReply: { parsed_output?: { beats?: unknown[] } & Record<string, unknown> } & Record<string, unknown>;
  lookReply: unknown;
  capUsd?: number;
  asks?: number;
  board?: string[][];
};
/** The parts of a request to Claude that the stand-in looks at. */
type Block = { type: string; text?: string };
type Request = { model: string; fallbacks?: string; output_config: { effort: string; format?: { type: string } }; messages: { content: string | Block[] }[] };
type Options = { signal?: AbortSignal } | undefined;

export async function standIn(input: StandIn) {
  const calls: unknown[] = [];
  const seen = (kind: string, params: Request, options: Options) => {
    const content = params.messages[0].content;
    const text = typeof content === "string" ? content : (content.find((block) => block.type === "text")?.text ?? "");
    calls.push({
      kind,
      model: params.model,
      effort: params.output_config.effort,
      structured: params.output_config.format?.type ?? null,
      fallbacks: params.fallbacks ?? null,
      picture: Array.isArray(content) && content.some((block) => block.type === "image"),
      signal: options?.signal instanceof AbortSignal,
      numbered: text.includes("1: 2x + 6 = 14, so x = 10"),
      namesRung: text.includes("Write the hint for this rung: look."),
      ...(input.asked.lines?.includes("") ? { hiddenLinesAreLeftOutAndNumbersKept: !/^\d+: $/m.test(text) && text.includes(`${input.asked.lines.length - 1}: ${input.asked.lines.at(-1)}`) } : {}),
      ...(input.asked.circled ? { namesWhatHeDrewAround: text.includes(`drew around lines ${input.asked.circled.join(", ")}`) } : {}),
      ...(input.asked.lesson?.drawn ? { namesWhatIsDrawn: text.includes(`still on their screen: ${input.asked.lesson.drawn.join("; ")}`) } : {}),
    });
  };
  const streamed = (params: Request, options: Options) => {
    seen("brain", params, options);
    // Written in the order the model writes in: the board before the sentences.
    const { beats = [], ...head } = input.brainReply.parsed_output ?? {};
    const text = input.brainReply.parsed_output ? JSON.stringify({ lesson: null, ...head, board: input.board ?? null, beats }) : "";
    const hearers: ((delta: string, soFar: string) => void)[] = [];
    return {
      on: (_event: string, hearer: (delta: string, soFar: string) => void) => hearers.push(hearer),
      async finalMessage() {
        const pieces = input.board ? Array.from({ length: 50 }, (_, i) => (i + 1) / 50) : [0.3, 0.6, 0.9, 1];
        for (const share of pieces) for (const hearer of hearers) hearer("", text.slice(0, Math.round(text.length * share)));
        return { ...input.brainReply, content: text ? [{ type: "text", text }] : [] };
      },
    };
  };
  // Only the two calls these rows reach are stood in for, which is why the cast.
  const client = {
    beta: { messages: { stream: streamed } },
    messages: { parse: async (params: Request, options: Options) => (seen("look", params, options), input.lookReply) },
  } as unknown as Anthropic;
  const picturePath = fresh("stand-in") + ".jpg";
  if (input.picture) writeFileSync(picturePath, "not a real picture");
  const capped = { ...settings, spendCapUsd: { ...settings.spendCapUsd, value: input.capUsd ?? settings.spendCapUsd.value } };
  const logged: string[] = [];
  const live = anthropic(capped, { answer: "answer prompt", secondLook: "second look prompt", opener: "opener prompt" }, (line) => logged.push(line), client);
  const signal = new AbortController().signal;
  const asked = { words: "", lines: [], fresh: false, circled: [], leadIn: null, lessons: [], ...input.asked, lesson: { ...empty, ...input.asked.lesson }, picturePath: input.picture ? picturePath : null, rung: settings.ladder.value[0] };
  try {
    let answered = null;
    let early = false;
    const boards = new Set<string>();
    for (let ask = 0; ask < (input.asks ?? 1); ask++) {
      answered = await live.brain.answer(asked, signal, (part) => {
        early ||= part.breakLine !== undefined && !part.whole;
        if (part.board !== undefined) boards.add(JSON.stringify(part.board));
      });
    }
    if (input.board) return { boardsGivenWhileItArrived: [...boards].map((board) => JSON.parse(board)), boardAtTheEnd: answered!.board };
    const leaks = await live.secondLook.leaks(answered!.beats[0].say, answered!.problem, signal);
    return { answered, leaks, calls, spentUsd: Number(live.spentUsd().toFixed(6)), toldTheLineEarly: early };
  } catch (error) {
    return { failed: (error as Error).message, calls: calls.length, theLogKeepsTheReply: logged.some((line) => line.includes("It wrote:")) };
  }
}

/** The kept voice over a counting stand-in: which lines called the live voice, and how much sound each say delivered. */
export async function keptVoice(input: { fixed: string[]; says: { text: string; voice: string }[] }) {
  const dir = fresh("kept");
  const calls: string[] = [];
  // Half a second of silence, then sound: the kept copy must lose the silence.
  const live = {
    async say(text: string, _signal: AbortSignal, onSound: (pcm: Buffer) => void, onWords: (spoken: Spoken) => void) {
      calls.push(text);
      onWords({ words: text.split(" "), start: text.split(" ").map((_, i) => 0.5 + i * 0.3), end: text.split(" ").map((_, i) => 0.8 + i * 0.3) });
      onSound(Buffer.alloc(24000));
      onSound(Buffer.alloc(48000, 0x40));
    },
  };
  let name = "";
  const voice = kept(live, input.fixed, () => name, dir, () => {});
  const out = [];
  for (const say of input.says) {
    name = say.voice;
    const before = calls.length;
    let bytes = 0;
    let firstWordAt = -1;
    await voice.say(say.text, new AbortController().signal, (pcm) => (bytes += pcm.length), (spoken) => (firstWordAt = Number(spoken.start[0].toFixed(2))));
    out.push({ text: say.text, voice: say.voice, calledTheLiveVoice: calls.length > before, bytes, firstWordAt });
  }
  return out;
}
