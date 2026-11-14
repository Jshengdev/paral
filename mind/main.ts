import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./adapters/anthropic.ts";
import { ink } from "./adapters/ink.ts";
import { raea } from "./adapters/raea.ts";
import { sonic } from "./adapters/sonic.ts";
import { tape } from "./adapters/tape.ts";
import type { Ports } from "./ports.ts";
import { serve } from "./server.ts";
import { settings } from "./settings.ts";

const here = import.meta.dirname;
const hidden = (line: string) => line.replace(/sk[-_][A-Za-z0-9_-]{12,}/g, "(key hidden)");
const log = (line: string) => console.log(`${new Date().toISOString()} ${hidden(line)}`);
const prompt = (name: string) => readFileSync(join(here, "prompts", `${name}.md`), "utf8");
const { ANTHROPIC_API_KEY, CARTESIA_API_KEY, PARAL_TAPE, PARAL_RECORD, PARAL_SOCKET, PARAL_FAULT, PARAL_SPEND } = process.env;

let ports: Ports = tape(PARAL_TAPE ?? join(here, "..", "test", "tapes", "algebra.json"));
const using: string[] = [];
const spent = { usd: () => 0, credits: { used: 0 } };
if (!PARAL_TAPE && ANTHROPIC_API_KEY) {
  const claude = anthropic(new Anthropic(), settings, { answer: prompt("answer"), secondLook: prompt("second-look"), opener: prompt("opener") }, log);
  ports = { ...ports, brain: claude.brain, secondLook: claude.secondLook, opener: claude.opener };
  spent.usd = claude.spentUsd;
  using.push(`brain ${settings.brainModel.value} (cap $${settings.spendCapUsd.value})`);
}
if (!PARAL_TAPE && CARTESIA_API_KEY) {
  ports = { ...ports, ear: ink(CARTESIA_API_KEY, settings, spent.credits, log), voice: sonic(CARTESIA_API_KEY, settings, spent.credits, log) };
  using.push(`ear ${settings.earModel.value}, voice ${settings.voiceModel.value} (cap ${settings.cartesiaCreditCap.value} credits)`);
}
const warming = new AbortController();
if (!PARAL_TAPE && ANTHROPIC_API_KEY) {
  // The clip takes the board's colours: chalk on the dark card.
  const lessons = raea(() => {
    const look = JSON.parse(readFileSync(join(here, "..", "body", "tokens.json"), "utf8"));
    return { ink: look.paper, accent: look.accent, ground: look.ink };
  });
  ports = { ...ports, lessons };
  using.push("lesson clips rendered by raea");
  // Every example is rendered once ahead of time, one after another, so the first ask that wants one gets it at once.
  void (async () => {
    for (const [name, lesson] of Object.entries(settings.lessons.value)) {
      for (const example of lesson.examples) {
        const began = Date.now();
        await lessons
          .render(name, example, warming.signal)
          .then(() => log(`lesson ${name} (${example.left} = ${example.right}) is ready after ${Date.now() - began} ms`))
          .catch((error) => warming.signal.aborted || log(`lesson ${name} could not be made ahead (${error instanceof Error ? error.message : error}); asks that want it will be words only`));
      }
    }
  })();
}
if (PARAL_FAULT === "voice") {
  ports = { ...ports, voice: { say: async () => Promise.reject(new Error("the voice was switched off for this run (PARAL_FAULT=voice)")) } };
  using.push("FAULT: the voice fails on purpose");
}
const socket = PARAL_SOCKET ?? settings.socketPath.value;
const mind = await serve(socket, ports, settings, log, PARAL_RECORD);
log(`mind is listening on ${socket}; live: ${using.join("; ") || "nothing"}; everything else is the TAPE (recorded answers)${PARAL_RECORD ? `; recording to ${PARAL_RECORD}` : ""}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    setTimeout(() => {
      log(`did not stop inside ${settings.stopLimitMs.value} ms; exiting anyway`);
      process.exit(1);
    }, settings.stopLimitMs.value).unref();
    warming.abort();
    if (PARAL_SPEND) writeFileSync(PARAL_SPEND, JSON.stringify({ usd: Number(spent.usd().toFixed(4)), cartesiaCredits: Math.round(spent.credits.used) }) + "\n");
    void mind.stop().then(() => process.exit(0));
  });
}
