import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { anthropic } from "./adapters/anthropic.ts";
import { silenced } from "./adapters/fault.ts";
import { ink } from "./adapters/ink.ts";
import { kept } from "./adapters/kept.ts";
import { looked } from "./adapters/looked.ts";
import { raea } from "./adapters/raea.ts";
import { sips } from "./adapters/sips.ts";
import { sonic } from "./adapters/sonic.ts";
import { tape } from "./adapters/tape.ts";
import type { KeptPage } from "./cores/page.ts";
import type { Ports } from "./ports.ts";
import { serve } from "./server.ts";
import { settings } from "./settings.ts";

// The mind's entry point: it picks an adapter for each port from the environment, starts the server, and stops it
// cleanly. With no key, or with PARAL_TAPE set, every port is the tape of recorded answers.

const here = import.meta.dirname;
const { ANTHROPIC_API_KEY, CARTESIA_API_KEY, PARAL_TAPE, PARAL_RECORD, PARAL_SOCKET, PARAL_FAULT, PARAL_SPEND } = process.env;
const hidden = (line: string) => line.replace(/sk[-_][A-Za-z0-9_-]{12,}/g, "(key hidden)");
const log = (line: string) => console.log(`${new Date().toISOString()} ${hidden(line)}`);
const prompt = (name: string) => readFileSync(join(here, "prompts", `${name}.md`), "utf8");

/** What the live services have cost in this run, for the caps and for the spend file. */
const spent = { usd: () => 0, credits: { used: 0 } };
/** What is live in this run, for the first log line. */
const using: string[] = [];
/** Stops the work done ahead of time (lesson clips, kept sound, kept looks) when the mind stops. */
const ahead = new AbortController();
/** Asks ahead for the first look of each kept page, once the pages are loaded; set when the deep model is live. */
let looksAhead: (pages: KeptPage[]) => void = () => {};

/** Claude for the answer, the second look and the fast lines. */
function claude(): Partial<Ports> {
  const live = anthropic(settings, { answer: prompt("answer"), secondLook: prompt("second-look"), opener: prompt("opener"), glance: prompt("glance"), workThrough: prompt("work-through"), wholeBoard: prompt("whole-board"), stepsColumn: prompt("steps-column"), fullAnswer: prompt("full-answer") }, log);
  spent.usd = live.spentUsd;
  using.push(`brain ${settings.brainModel.value} (cap $${settings.spendCapUsd.value})`);
  // A page's first look is kept on disk for the day, named by what would change it, and asked ahead at the start
  // for the pages of the demo first: tonight that look took from 4 to 17 s when asked as the page came up.
  const stamp = createHash("sha256").update(JSON.stringify([settings.brainModel.value, settings.brainEffort.value, settings.pageLinesGiven.value, prompt("glance")])).digest("hex").slice(0, 12);
  const looks = looked(live.glancer, stamp, join(here, "..", "tmp", "looks"), log);
  const demoFirst = (pages: KeptPage[]) => [...pages].sort((a, b) => Number(b.name in settings.demoSteps.value) - Number(a.name in settings.demoSteps.value));
  looksAhead = (pages) => void looks.ahead(demoFirst(pages), Date.now(), ahead.signal);
  return { brain: live.brain, secondLook: live.secondLook, opener: live.opener, glancer: looks };
}

/** Cartesia for the ear and the voice. The lines whose words never change are spoken from kept sound. */
function cartesia(key: string): Partial<Ports> {
  const fixed = [
    settings.openerFallback.value,
    settings.openerInLesson.value,
    ...settings.stallLines.value,
    settings.stallShort.value,
    ...settings.ladder.value.map((rung) => rung.safe),
    settings.heldBackLine.value,
    settings.circleNoWordsLine.value,
    settings.noPageLine.value,
    settings.leftOutLine.value,
    settings.showMeDoneLine.value,
  ];
  // "Opening the ... page." changes with the page, so it is spoken live.
  const voiceName = () => `cartesia ${settings.voiceModel.value} ${settings.voiceId.value} pcm_s16le 24000`;
  // Kept under tmp/, which is not committed: the sound is made once on each Mac, for the voice in use.
  const voice = kept(sonic(key, settings, spent.credits, log), fixed, voiceName, join(here, "..", "tmp", "voice"), log);
  void voice.ahead(ahead.signal);
  using.push(`ear ${settings.earModel.value}, voice ${settings.voiceModel.value} (cap ${settings.cartesiaCreditCap.value} credits), ${fixed.length} fixed lines from kept sound`);
  return { ear: ink(key, settings, spent.credits, log), voice };
}

/** Lesson clips rendered by raea, in the board's colours: chalk on the dark card. */
function lessonClips(): Partial<Ports> {
  const lessons = raea(() => {
    const look = JSON.parse(readFileSync(join(here, "..", "body", "tokens.json"), "utf8"));
    return { ink: look.paper, accent: look.accent, ground: look.ink };
  });
  using.push("lesson clips rendered by raea");
  void renderAhead(lessons);
  return { lessons };
}

/** Renders every example once, one after another, so the first ask that wants one gets it at once. */
async function renderAhead(lessons: NonNullable<Ports["lessons"]>) {
  for (const [name, lesson] of Object.entries(settings.lessons.value)) {
    for (const example of lesson.examples) {
      const began = Date.now();
      await lessons.render(name, example, ahead.signal).then(
        () => log(`lesson ${name} (${example.left} = ${example.right}) is ready after ${Date.now() - began} ms`),
        (error) => ahead.signal.aborted || log(`lesson ${name} could not be made ahead (${error instanceof Error ? error.message : error}); asks that want it will be words only`),
      );
    }
  }
}

/** USC's pages as read ahead of time by `pages/gather.ts`. With none kept, paral speaks only of what is on the screen. */
function keptPages(): KeptPage[] {
  const dir = join(here, "..", "pages", "kept");
  if (!existsSync(dir)) return [];
  const kept = readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")) as KeptPage);
  if (kept.length > 0) using.push(`${kept.length} of USC's pages kept from ${kept.map((page) => page.readOn).sort()[0]} on`);
  return kept;
}

/** The pages measured once, with a box for each place of a drawing (`sheets/`). */
function measuredSheets(): Ports["sheets"] {
  const dir = join(here, "..", "sheets");
  if (!existsSync(dir)) return [];
  const sheets = readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")));
  if (sheets.length > 0) using.push(`${sheets.length} measured sheet${sheets.length === 1 ? "" : "s"}`);
  return sheets;
}

const live = !PARAL_TAPE;
let ports: Ports = tape(PARAL_TAPE ?? join(here, "..", "test", "tapes", "algebra.json"));
if (live && ANTHROPIC_API_KEY) ports = { ...ports, ...claude() };
if (live && CARTESIA_API_KEY) ports = { ...ports, ...cartesia(CARTESIA_API_KEY) };
if (live && ANTHROPIC_API_KEY) ports = { ...ports, ...lessonClips() };
if (live) ports = { ...ports, pages: keptPages(), sheets: measuredSheets(), cutter: sips(log) };
if (live) looksAhead(ports.pages);
if (PARAL_FAULT === "voice") {
  ports = { ...ports, voice: silenced };
  using.push("FAULT: the voice fails on purpose");
}

const socket = PARAL_SOCKET ?? settings.socketPath.value;
const mind = await serve(socket, ports, settings, log, PARAL_RECORD);
log(`mind is listening on ${socket}; live: ${using.join("; ") || "nothing"}; everything else is the TAPE (recorded answers)${PARAL_RECORD ? `; recording to ${PARAL_RECORD}` : ""}`);

/** Stops the work ahead, writes what the run cost, and closes the server; if that hangs, exits anyway and says so. */
function stop() {
  setTimeout(() => {
    log(`did not stop inside ${settings.stopLimitMs.value} ms; exiting anyway`);
    process.exit(1);
  }, settings.stopLimitMs.value).unref();
  ahead.abort();
  if (PARAL_SPEND) writeFileSync(PARAL_SPEND, JSON.stringify({ usd: Number(spent.usd().toFixed(4)), cartesiaCredits: Math.round(spent.credits.used) }) + "\n");
  void mind.stop().then(() => process.exit(0));
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
