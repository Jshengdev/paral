import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { settled } from "../cores/partial.ts";
import { arriving, asking, cleaned, pagesRead, Reply } from "./claude-shape.ts";
import { Answered, type Brain, type Opener, type SecondLook } from "../ports.ts";
import type { Settings } from "../settings.ts";


const Look = z.object({ leaks: z.boolean() });

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
type Log = (line: string) => void;
export type Prompts = { answer: string; secondLook: string; opener: string };


/** Claude behind three ports. The client is built here; a row may hand in a stand-in instead. */
export function anthropic(settings: Settings, prompts: Prompts, log: Log, client: Anthropic = new Anthropic()): { brain: Brain; secondLook: SecondLook; opener: Opener; spentUsd(): number } {
  const prices = settings.pricesUsdPerMTok.value;
  // A model with no price would be asked, and paid for, and fail only when its cost is counted. It is refused here.
  for (const model of [settings.brainModel.value, settings.secondLookModel.value, settings.openerModel.value]) {
    if (!prices[model]) throw new Error(`no price is set for the model "${model}"; add it to pricesUsdPerMTok in mind/settings/brain.ts or choose another model`);
  }
  let spentUsd = 0;

  function allowed() {
    if (spentUsd >= settings.spendCapUsd.value) {
      throw new Error(`the spend cap of $${settings.spendCapUsd.value} is reached ($${spentUsd.toFixed(3)} spent); raise spendCapUsd in settings to go on`);
    }
  }

  function count(model: string, asked: string, usage: Usage) {
    const price = prices[model] ?? prices[asked];
    // Tokens the service kept from an earlier ask are counted at a twentieth of the input price, and tokens it is
    // asked to keep for an hour at twice it. Both are the published ratios, rounded; the count is for the cap only.
    const kept = usage.cache_read_input_tokens ?? 0;
    const keeping = usage.cache_creation_input_tokens ?? 0;
    spentUsd += ((usage.input_tokens + keeping * 2 + kept * 0.05) * price.input + usage.output_tokens * price.output) / 1_000_000;
    const cached = kept + keeping > 0 ? ` (and ${kept} kept from before, ${keeping} newly kept)` : "";
    log(`${model}: ${usage.input_tokens} tokens in${cached}, ${usage.output_tokens} out; $${spentUsd.toFixed(3)} spent of $${settings.spendCapUsd.value}`);
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
        // USC's kept pages go first and are marked to be kept by the service for an hour: they are the same for every
        // ask on that site, so after the first ask they cost a twentieth and no longer slow the answer.
        const read = pagesRead(asked, settings.pageLinesGiven.value);
        const pages = read === null ? [] : [{ type: "text" as const, text: read, cache_control: { type: "ephemeral" as const, ttl: "1h" as const } }];
        const stream = client.beta.messages.stream(
          {
            model,
            max_tokens: settings.brainMaxTokens.value,
            system: prompts.answer,
            // Opted in on purpose: when the model will not take a request, the API may answer from its fallback model
            // instead of failing the ask.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: settings.brainEffort.value, format: betaZodOutputFormat(Reply) },
            messages: [{ role: "user", content: [...pages, ...picture, { type: "text", text: asking(asked) }] }],
          },
          { signal },
        );
        if (onPart) {
          stream.on("text", (_delta: string, soFar: string) => {
            const part = settled(soFar);
            if (part !== null && !part.whole) onPart(arriving(part));
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
        const answered = parsed?.success ? Answered.safeParse(cleaned(parsed.data)) : null;
        if (answered?.success) return answered.data;
        // The reason and the reply's own text are kept, so the log explains a failure by itself. He sees plain words.
        const why = answered ? answered.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") : `it did not fit the contract (it stopped with "${reply.stop_reason}")`;
        log(`the model's reply could not be used: ${why}. It wrote: ${text.slice(0, settings.replyLoggedChars.value)}`);
        throw new Error(settings.lostAnswerLine.value);
      },
    },
    opener: {
      async open(words, lines, stillSpeaking, signal) {
        allowed();
        const model = settings.openerModel.value;
        const stream = client.messages.stream(
          {
            model,
            max_tokens: settings.openerMaxTokens.value,
            thinking: { type: "disabled" },
            output_config: { effort: settings.openerEffort.value },
            system: prompts.opener,
            messages: [{ role: "user", content: `${stillSpeaking ? "What they have said so far (they are still speaking, and the question may not be finished)" : "What they just said to you"}: "${words}"\n\nLines on their screen:\n${lines.slice(0, settings.openerPageLines.value).join("\n")}` }],
          },
          { signal },
        );
        const reply = await stream.finalMessage();
        count(reply.model, model, reply.usage);
        const text = reply.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");
        // One line is asked for. If the model wrote more, only the first is the quick line; quote marks it put
        // around the whole line are not part of it.
        const first = text.split("\n").map((part) => part.trim()).find(Boolean) ?? "";
        return /^["“'].*["”']$/.test(first) ? first.slice(1, -1).trim() : first;
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
