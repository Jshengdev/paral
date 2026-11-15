import { readFileSync } from "node:fs";
import { z } from "zod";
import { Answered, type Asked, type Ports } from "../ports.ts";

const Tape = z.object({
  answers: z.record(z.string(), z.array(Answered.extend({ hold: z.boolean().optional(), late: z.boolean().optional() }))),
  leaks: z.array(z.string()),
  holdSecondLook: z.boolean().optional(),
  failSecondLook: z.boolean().optional(),
  holdOpener: z.boolean().optional(),
  opener: z.string().optional(),
  /** What a look he did not ask for finds on a kept page; null for a page that holds nothing. Absent: no such looks. */
  glance: z.object({ kind: z.enum(["date", "step", "passed"]).optional(), line: z.string(), under: z.string(), say: z.string(), sayInView: z.string(), ahead: z.array(z.object({ step: z.string(), by: z.string() })) }).nullable().optional(),
  /** What a look finds when he has just been sent to the page by an answer: the thing he was sent for. */
  glanceAfterAsk: z.object({ line: z.string(), under: z.string(), say: z.string(), sayInView: z.string(), ahead: z.array(z.object({ step: z.string(), by: z.string() })) }).nullable().optional(),
  pages: z.array(z.object({ name: z.string(), url: z.string(), readOn: z.string(), title: z.string(), lines: z.array(z.string()) })).optional(),
  voice: z.boolean().optional(),
  clip: z.object({ clip: z.string(), still: z.string(), seconds: z.number() }).optional(),
});

const plain = (words: string) => words.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
/** The tape voice's pace: about how fast the live voice speaks, so a taped film is paced like a live one. */
const SECONDS_A_WORD = 0.3;
/** The voice as the seam carries it: 16-bit sound at 24 kHz, one channel. The tape's sound is silence of the right length. */
const RATE = 24000;

/**
 * Recorded answers in place of every outside service. `asked` lists what the brain was asked, for rows to read. The tape ear reads the sound's bytes as text. An answer keyed
 * "his words @ 1,2" is the one for those words when he drew around lines 1 and 2.
 */
export function tape(path: string): Ports & { release(kind?: string): void; asked: Asked[] } {
  const recorded = Tape.parse(JSON.parse(readFileSync(path, "utf8")));
  const played = new Map<string, number>();
  const gates = new Map<() => void, string>();

  const held = (signal: AbortSignal, kind: string) =>
    new Promise<void>((resolve, reject) => {
      const open = () => {
        gates.delete(open);
        resolve();
      };
      gates.set(open, kind);
      signal.addEventListener("abort", () => {
        gates.delete(open);
        reject(signal.reason);
      });
    });

  const asked: Asked[] = [];
  return {
    asked,
    /** Lets through what is being held: everything, or only one kind ("answer", "second look" or "opener"). */
    release(kind) {
      for (const [open, held] of [...gates]) if (kind === undefined || kind === held) open();
    },
    brain: {
      async answer(ask, signal, onPart) {
        asked.push(ask);
        const words = plain(ask.words);
        const around = `${words} @ ${ask.circled.join(",")}`;
        const said = ask.circled.length > 0 && recorded.answers[around] ? around : words;
        const takes = recorded.answers[said];
        if (!takes) throw new Error(`the tape has no answer for "${said}"; it knows: ${Object.keys(recorded.answers).join(", ")}`);
        const turn = played.get(said) ?? 0;
        played.set(said, turn + 1);
        const { hold, late, ...answered } = takes[Math.min(turn, takes.length - 1)];
        // `late` holds the whole answer back, its first field too; `hold` lets the first fields out and holds the rest.
        if (late) await held(signal, "answer");
        // A few ticks first, so what is sent as the ask begins is out before the answer's first field, the order
        // the live services give (the deep model takes about three seconds).
        for (let tick = 0; tick < 4; tick++) await null;
        onPart?.({ problem: answered.problem, breakLine: answered.breakLine, breakIndex: answered.breakIndex ?? null, result: answered.result, lesson: answered.lesson ?? null, board: answered.board ?? null, nextMark: answered.beats[0].mark, beats: [], whole: false });
        if (hold) await held(signal, "answer");
        return answered;
      },
    },
    secondLook: {
      async leaks(line, _problem, signal) {
        if (recorded.holdSecondLook) await held(signal, "second look");
        if (recorded.failSecondLook) throw new Error("the tape's second look fails on purpose");
        return recorded.leaks.includes(line);
      },
    },
    ear: {
      listen(onWords) {
        let text = "";
        return {
          sound(pcm) {
            text += pcm.toString("utf8");
            onWords(text);
          },
          finish: async () => text,
        };
      },
    },
    opener: recorded.opener ? {
          async open(_words, _lines, _stillSpeaking, signal) {
            if (recorded.holdOpener) await held(signal, "opener");
            return recorded.opener!;
          },
        } : null,
    lessons: recorded.clip ? { render: async () => recorded.clip! } : null,
    glancer:
      recorded.glance !== undefined
        ? {
            async glance(_page, _today, _signal, following) {
              const found = following ? recorded.glanceAfterAsk : recorded.glance;
              return found ? { kind: following ? "step" : "date", ...found } : null;
            },
          }
        : null,
    pages: recorded.pages ?? [],
    voice: recorded.voice
      ? {
          async say(text, _signal, onSound, onWords) {
            const words = text.split(/\s+/).filter(Boolean);
            onWords({ words, start: words.map((_, i) => i * SECONDS_A_WORD), end: words.map((_, i) => (i + 1) * SECONDS_A_WORD) });
            onSound(Buffer.alloc(Math.round(words.length * SECONDS_A_WORD * RATE) * 2));
          },
        }
      : null,
  };
}
