import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { settled } from "../cores/partial.ts";
import { asking, Mark, Reply } from "./claude-shape.ts";
import { Answered, type Brain, type Opener, type SecondLook } from "../ports.ts";
import type { Settings } from "../settings.ts";


const Look = z.object({ leaks: z.boolean() });

type Usage = { input_tokens: number; output_tokens: number };
type Log = (line: string) => void;
export type Prompts = { answer: string; secondLook: string; opener: string };


export function anthropic(client: Anthropic, settings: Settings, prompts: Prompts, log: Log): { brain: Brain; secondLook: SecondLook; opener: Opener; spentUsd(): number } {
  const prices = settings.pricesUsdPerMTok.value;
  let spentUsd = 0;

  function allowed() {
    if (spentUsd >= settings.spendCapUsd.value) {
      throw new Error(`the spend cap of $${settings.spendCapUsd.value} is reached ($${spentUsd.toFixed(3)} spent); raise spendCapUsd in settings to go on`);
    }
  }

  function count(model: string, asked: string, usage: Usage) {
    const price = prices[model] ?? prices[asked];
    spentUsd += (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1_000_000;
    log(`${model}: ${usage.input_tokens} tokens in, ${usage.output_tokens} out; $${spentUsd.toFixed(3)} spent of $${settings.spendCapUsd.value}`);
  }

  return {
    spentUsd: () => spentUsd,
    brain: {
      async answer(asked, signal, onPart) {
        allowed();
        const model = settings.brainModel.value;
        const picture = asked.picturePath
          ? [{
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: asked.picturePath.endsWith(".png") ? ("image/png" as const) : ("image/jpeg" as const),
                data: readFileSync(asked.picturePath).toString("base64"),
              },
            }]
          : [];
        const numbered = (index: number | null | undefined) => (index != null && index >= 0 ? index : null);
        const marked = (mark: z.infer<typeof Mark>) =>
          mark && mark.quote ? { ...mark, index: numbered(mark.index), label: mark.label || null, toIndex: numbered(mark.toIndex), toQuote: mark.toQuote || null } : null;
        const boarded = (board: string[][] | null) => {
          const rows = (board ?? []).map((row) => row.filter(Boolean)).filter((row) => row.length > 0);
          return rows.length > 0 ? rows : null;
        };
        const tidy = (reply: z.infer<typeof Reply>) => {
          return {
            problem: reply.problem,
            breakIndex: numbered(reply.breakIndex),
            breakLine: reply.breakLine || null,
            result: reply.result || null,
            lesson: reply.lesson || null,
            beats: reply.beats.map(({ say, mark }) => ({ say, mark: marked(mark) })),
            board: boarded(reply.board),
          };
        };
        const stream = client.beta.messages.stream(
          {
            model,
            max_tokens: settings.brainMaxTokens.value,
            system: prompts.answer,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: settings.brainEffort.value, format: betaZodOutputFormat(Reply) },
            messages: [{ role: "user", content: [...picture, { type: "text", text: asking(asked) }] }],
          },
          { signal },
        );
        if (onPart) {
          stream.on("text", (_delta: string, soFar: string) => {
            const part = settled(soFar);
            if (part === null || part.whole) return;
            const beats = Reply.shape.beats.safeParse(part.beats);
            const board = Reply.shape.board.safeParse(part.board);
            const next = Mark.safeParse((part.next as { mark?: unknown } | undefined)?.mark);
            onPart({
              ...(typeof part.problem === "string" ? { problem: part.problem } : {}),
              ...(part.breakLine !== undefined ? { breakLine: part.breakLine || null, breakIndex: typeof part.breakIndex === "number" && part.breakIndex >= 0 ? part.breakIndex : null } : {}),
              ...(part.result !== undefined ? { result: part.result || null } : {}),
              ...(part.lesson !== undefined ? { lesson: part.lesson || null } : {}),
              ...(part.board !== undefined && board.success ? { board: boarded(board.data) } : {}),
              ...(next.success && (part.next as { mark?: unknown } | undefined)?.mark !== undefined ? { nextMark: marked(next.data) } : {}),
              beats: beats.success ? tidy({ problem: "", breakIndex: null, breakLine: null, result: null, lesson: null, beats: beats.data, board: null }).beats : [],
              whole: false,
            });
          });
        }
        const reply = await stream.finalMessage();
        count(reply.model, model, reply.usage);
        if (reply.stop_reason === "refusal") {
          log("the model declined this ask");
          throw new Error(settings.declinedLine.value);
        }
        const text = reply.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
        const whole = settled(text);
        const parsed = whole?.whole ? Reply.safeParse(whole) : null;
        const answered = parsed?.success ? Answered.safeParse(tidy(parsed.data)) : null;
        if (!answered?.success) {
          // The reason and the reply's own text are kept, so the log explains a failure by itself. He sees plain words.
          const why = !parsed?.success ? `it did not fit the contract (it stopped with "${reply.stop_reason}")` : answered!.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
          log(`the model's reply could not be used: ${why}. It wrote: ${text.slice(0, 3000)}`);
          throw new Error(settings.lostAnswerLine.value);
        }
        return answered.data;
      },
    },
    opener: {
      async open(words, lines, signal) {
        allowed();
        const model = settings.openerModel.value;
        const stream = client.messages.stream(
          {
            model,
            max_tokens: 1000,
            thinking: { type: "disabled" },
            output_config: { effort: "low" },
            system: prompts.opener,
            messages: [{ role: "user", content: `What they just said to you: "${words}"\n\nLines on their screen:\n${lines.slice(0, 40).join("\n")}` }],
          },
          { signal },
        );
        const written = (text: string) => text.split("\n").map((part) => part.trim()).filter(Boolean);
        const whole = stream.finalMessage().then((reply) => {
          count(reply.model, model, reply.usage);
          return written(reply.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n"));
        });
        const seen = whole.then(([, second = ""]) => (second === "" || /^none\b/i.test(second) ? null : second));
        seen.catch(() => {});
        // The first line is handed over the moment it is complete, so it is not held back by the second.
        const line = await new Promise<string>((resolve, reject) => {
          stream.on("text", (_delta: string, soFar: string) => {
            const lines = written(soFar);
            if (lines.length > 1 || (lines.length === 1 && soFar.trimStart().includes("\n"))) resolve(lines[0]);
          });
          whole.then(([first = ""]) => resolve(first), reject);
        });
        return { line, seen };
      },
    },
    secondLook: {
      async leaks(line, problem, signal) {
        allowed();
        const model = settings.secondLookModel.value;
        const reply = await client.messages.parse(
          {
            model,
            max_tokens: settings.secondLookMaxTokens.value,
            thinking: { type: "disabled" },
            system: prompts.secondLook,
            output_config: { effort: settings.secondLookEffort.value, format: zodOutputFormat(Look) },
            messages: [{ role: "user", content: `The problem: ${problem}\n\nThe line about to be shown: ${line}` }],
          },
          { signal },
        );
        count(reply.model, model, reply.usage);
        if (reply.parsed_output === null) {
          log(`second look gave no verdict (it stopped with "${reply.stop_reason}"); the line is treated as a leak`);
          return true;
        }
        return reply.parsed_output.leaks;
      },
    },
  };
}
