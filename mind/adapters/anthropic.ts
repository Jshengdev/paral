import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { settled } from "../cores/partial.ts";
import { arriving, asking, cleaned, Glance, pagesRead, Reply } from "./claude-shape.ts";
import { Walk, walked, walking } from "./claude-walk.ts";
import { Answered, type Brain, type Glancer, type Opener, type SecondLook } from "../ports.ts";
import type { Settings } from "../settings.ts";


const Look = z.object({ leaks: z.boolean() });
/** A picture of one dot, for a request that keeps pages ahead of an ask. */
const DOT = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
type Log = (line: string) => void;
/**
 * `workThrough` is added to the answer's prompt only for a step of the working he asked to have worked through.
 * `wholeBoard` is added after the ask's own words, only when he asked for the whole thing drawn, and `fullAnswer` the
 * same way only on a broad follow-up: the prompt and the kept pages before it stay as they are, so the service still
 * has them kept.
 */
export type Prompts = { answer: string; secondLook: string; opener: string; glance: string; workThrough?: string; wholeBoard?: string; fullAnswer?: string };


/** Claude behind three ports. The client is built here; a row may hand in a stand-in instead. */
export function anthropic(settings: Settings, prompts: Prompts, log: Log, client: Anthropic = new Anthropic()): { brain: Brain; secondLook: SecondLook; opener: Opener; glancer: Glancer; spentUsd(): number } {
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

  /** When each set of kept pages was last asked to be kept, by its own text: an ask counts, since it keeps them too. */
  const warmedAt = new Map<string, number>();
  /** The kept pages as an ask sends them: a block of its own, marked to be kept by the service for an hour. */
  const kept = (read: string) => [{ type: "text" as const, text: read, cache_control: { type: "ephemeral" as const, ttl: "1h" as const } }];

  return {
    spentUsd: () => spentUsd,
    brain: {
      warm(known, today) {
        const read = settings.warmPages.value ? pagesRead(known, today, settings.pageLinesGiven.value) : null;
        if (read === null || Date.now() - (warmedAt.get(read) ?? -Infinity) < settings.warmAgainAfterMs.value) return;
        if (spentUsd >= settings.spendCapUsd.value * settings.warmUnderShare.value) return;
        warmedAt.set(read, Date.now());
        const model = settings.brainModel.value;
        // Everything an ask sends ahead of what changes, exactly as an ask sends it, with a picture of one dot in the
        // place of his screen (a request with a picture and one without are not kept as one) and one token of reply.
        client.beta.messages
          .create({
            model,
            max_tokens: 1,
            system: prompts.answer,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: settings.brainEffort.value, format: betaZodOutputFormat(Reply) },
            messages: [{ role: "user", content: [...kept(read), { type: "image", source: { type: "base64", media_type: "image/png", data: DOT } }, { type: "text", text: "." }] }],
          })
          .then((reply) => (count(reply.model, model, reply.usage), log(`the pages for "${known[0].title}" are kept ahead of an ask`)))
          .catch((error) => log(`the pages for "${known[0].title}" could not be kept ahead (${error instanceof Error ? error.message : error}); an ask there keeps them itself`));
      },
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
        const read = pagesRead(asked.known, asked.today, settings.pageLinesGiven.value);
        const pages = read === null ? [] : kept(read);
        if (read !== null) warmedAt.set(read, Date.now());
        // A step of the working is asked with the answer's prompt and its own added, in its own shape; nothing else changes.
        const walk = asked.walk;
        if (walk && !prompts.workThrough) throw new Error("the work-through prompt was not loaded");
        const added = asked.whole ? prompts.wholeBoard : asked.full ? prompts.fullAnswer : null;
        if (added === undefined) throw new Error(`the ${asked.whole ? "whole-board" : "full-answer"} prompt was not loaded`);
        const words = walk ? walking({ ...asked, walk }, settings.workThroughSpotsMost.value) : added ? `${asking(asked)}\n\n${added}` : asking(asked);
        const stream = client.beta.messages.stream(
          {
            model,
            max_tokens: settings.brainMaxTokens.value,
            system: walk ? `${prompts.answer}\n\n${prompts.workThrough}` : prompts.answer,
            // Opted in on purpose: when the model will not take a request, the API may answer from its fallback model
            // instead of failing the ask.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: settings.brainEffort.value, format: walk ? betaZodOutputFormat(Walk) : betaZodOutputFormat(Reply) },
            messages: [{ role: "user", content: [...pages, ...picture, { type: "text", text: words }] }],
          },
          { signal },
        );
        if (onPart && !walk) {
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
        const parsed = whole?.whole ? (walk ? Walk : Reply).safeParse(whole) : null;
        const answered = parsed?.success ? Answered.safeParse(walk ? walked(parsed.data as z.infer<typeof Walk>, walk.steps.length) : cleaned(parsed.data as z.infer<typeof Reply>)) : null;
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
    glancer: {
      async glance(page, today, signal, following) {
        allowed();
        const model = settings.brainModel.value;
        const date = new Date(today).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const sent = following ? `\n\nA moment ago they asked you: "${following.words}" You told them: "${following.told.join(" ")}" They have now come to this page. Look for what they were sent here for, as the second part of your instructions says.` : "";
        // Only the kept page's own text goes, with today's date: nothing that was read from his screen.
        const reply = await client.messages.parse(
          {
            model,
            max_tokens: settings.glanceMaxTokens.value,
            system: prompts.glance,
            output_config: { effort: settings.brainEffort.value, format: zodOutputFormat(Glance) },
            messages: [{ role: "user", content: `Today is ${date}. The page on their screen is "${page.title}".${sent}\n\n${pagesRead([page], today, settings.pageLinesGiven.value)}` }],
          },
          { signal },
        );
        count(reply.model, model, reply.usage);
        const seen = reply.parsed_output;
        if (seen === null || !seen.found || seen.line.trim() === "" || seen.say.trim() === "") return null;
        return { kind: seen.kind, line: seen.line, under: seen.under, say: seen.say, sayInView: seen.sayInView || seen.say, ahead: seen.ahead.filter((step) => step.step.trim() !== "") };
      },
    },
  };
}
