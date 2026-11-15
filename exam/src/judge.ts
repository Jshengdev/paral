import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { Judged } from "./explain.ts";
import { film, frameAt, frameCount, still } from "./film.ts";
import { board, lesson, readable, type BoardLook } from "./judge/board.ts";
import { closing, cutIn, ending, pressedAgain } from "./judge/ending.ts";
import { atEnd, atRest, inked, look, thinkingShown, trail } from "./judge/frames.ts";
import { marks, standingBefore } from "./judge/marks.ts";
import { kept } from "./judge/keep.ts";
import { walked } from "./judge/showme.ts";
import { glanced, pageChanged, wayDrawn, wayShown } from "./judge/look.ts";
import { pagesGiven, readSoFar, type PageRead } from "./judge/pages.ts";
import { pictureSent } from "./judge/picture.ts";
import { drawnIn } from "./judge/motion.ts";
import { takenBack, thinkingSaid, timing } from "./judge/timing.ts";
import { heardWhole, voiced } from "./judge/voice.ts";
import { spoken } from "./judge/words.ts";
import { runDir } from "./prepare.ts";
import { readings } from "./readings.ts";
import { moments, placed } from "./session.ts";
import { sound } from "./sound.ts";
import { Flow, Truth, findNamed, type Box, type Scenario } from "./shape.ts";
import { appCommit, BUILD } from "./tools.ts";
import { asks, first, looks, of, spoken as aloud, type Ask, type Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

const read = async <S extends z.ZodType>(file: string, shape: S): Promise<z.infer<S>> => shape.parse(JSON.parse(await readFile(file, "utf8")));

async function stills(dir: string, all: Ask[], frames: number): Promise<Judged["stills"]> {
  const out: Judged["stills"] = [];
  const add = async (ms: number, name: string, caption: string) => {
    await still(dir, Math.min(frames, frameAt(ms)), name);
    out.push({ file: `${name}.jpg`, caption });
  };
  for (const ask of all) {
    const n = ask.index + 1;
    if (ask.up !== null) await add(ask.down + (ask.up - ask.down) * 0.6, `ask${n}-1-talking`, `Ask ${n}: while he talks`);
    if (ask.up !== null) await add(ask.up + 300, `ask${n}-2-released`, `Ask ${n}: 0.3 s after he lets go`);
    const say = first(ask.moments, "say");
    if (say) await add(say.at + 400, `ask${n}-3-first-words`, `Ask ${n}: its first words`);
    const mark = first(ask.moments, "mark");
    if (mark) await add(mark.at + 1500, `ask${n}-4-mark`, `Ask ${n}: the first mark, drawn`);
    const card = first(ask.moments, "board");
    if (card) await add(card.at + 2500, `ask${n}-5-board`, `Ask ${n}: the board`);
  }
  await still(dir, frames, "end");
  out.push({ file: "end.jpg", caption: "The last frame" });
  return out;
}

function boxOf(truth: Truth[], name: string, scenario: string): Box {
  const found = findNamed(truth, name);
  if (!found) throw new Error(`${scenario}: the page has nothing named "${name}" to circle`);
  return found.box;
}

/** The build's own name for this ask ("t1"), which every line it says carries. */
const turnOf = (ask: Ask) => first(ask.moments, "say")?.id.split(":")[0] ?? "";

export async function judge(scenario: Scenario): Promise<Judged> {
  const dir = runDir(scenario.id);
  const truth = await read(join(dir, "truth.json"), z.array(Truth));
  const flow = await read(join(dir, "flow.json"), Flow);
  const everything = await moments(dir);
  const all = asks(everything);
  const seenLooks = looks(everything);
  // The page on the screen at each step: the scenario's own, until a step puts another one there.
  const truths: Truth[][] = [];
  let onScreen = truth;
  let pages = 0;
  for (const step of scenario.steps) {
    if ("page" in step && step.page) onScreen = await read(join(dir, `truth-${++pages}.json`), z.array(Truth));
    truths.push(onScreen);
  }
  const numbered = scenario.steps.map((step, at) => ({ step, truth: truths[at] }));
  const where = await placed(dir);
  const given = await pagesGiven(dir);
  /**
   * Every page read in the sitting by the time something named `name` was said: the pages the record gives under each
   * name that had spoken by then, in the order they spoke. A "show me" step asks no model and names no page of its
   * own, so it is held to what the looks and asks before it read.
   */
  const readBy = (name: string, at: number): PageRead[] => {
    const names = [...new Set([...of(everything, "say").filter((m) => m.at <= at).map((m) => m.id.split(":")[0]), name])];
    return readSoFar(new Map(names.map((one) => [one, given.get(one) ?? []]))).get(name) ?? [];
  };
  // How the judged build draws a board, from its own look file; the film was drawn with it.
  const boardLook: BoardLook = (await read(join(BUILD, "body", "tokens.json"), z.object({ board: z.object({ pad: z.number(), boxPadY: z.number(), rowGap: z.number(), type: z.number() }) }))).board;
  /** The last board shown under one name ("t1", "g1"): how many rows it has, and the card the painter drew for it. */
  const lastBoard = (shown: Moment[], name: string) => {
    const text = of(shown, "board").at(-1)?.text ?? null;
    const drawn = where.filter((p) => p.what === "board" && p.id === name).at(-1);
    return { rows: text === null ? 0 : text.split(" | ").length, card: drawn?.box ?? null, type: drawn?.type };
  };
  const ran = (await stat(join(dir, "session.jsonl"))).mtime;
  const filmed = existsSync(join(dir, "frames"));
  const seen = filmed ? await look(dir, flow.display) : null;
  const voice = existsSync(join(dir, "voice.wav")) ? await sound(join(dir, "voice.wav")) : null;
  const verdicts: Verdict[] = seen ? await atRest(seen) : [];
  const steps = numbered.filter(({ step }) => "say" in step);
  for (const [index, { step, truth }] of steps.entries()) {
    const ask = all[index];
    if (!ask) throw new Error(`${scenario.id}: the run holds ${all.length} asks, and the scenario has ${steps.length}`);
    if (!("say" in step)) continue;
    const nextDown = all[index + 1]?.down ?? null;
    // Where this ask's stretch of the film ends: his next press, or the next look with no key.
    const nextStart = everything.find((m) => (m.kind === "key-down" || m.kind === "glance") && m.at > ask.down)?.at ?? Infinity;
    if (step.say !== "") verdicts.push(...timing(ask, step.expect, where, nextDown), ...(seen ? await thinkingShown(seen, ask, where) : thinkingSaid(ask)));
    if (!takenBack(ask, nextDown)) verdicts.push(...heardWhole(ask, step.say));
    verdicts.push(...marks(ask, step.expect, truth, standingBefore(everything, ask)), ...spoken(ask, step.expect, truth, { pages: readBy(turnOf(ask), ask.down), ranOn: ran }), ...voiced(ask, step.expect, all[index + 1]?.down ?? null),
      ...board(ask, step.expect, truth, where), ...lesson(ask, step.expect), ...cutIn(ask, all[index - 1] ?? null, step.expect, voice), ...pressedAgain(ask, all[index - 1] ?? null, step.expect), ...kept(ask, step.expect), ...walked(ask, step.expect), ...wayShown("C20", ask.index, ask.moments, step.expect), ...(filmed ? wayDrawn("C20", ask.index, ask.moments, step.expect, where, truth, flow.display) : []));
    const drawnBoard = lastBoard(ask.moments, turnOf(ask));
    verdicts.push(...readable("C8", ask.index, drawnBoard.rows, drawnBoard.card, boardLook, drawnBoard.type));
    if (seen) {
      const circled = step.circle === null ? null : boxOf(truth, step.circle, scenario.id);
      // With no voice there is no last word to wait for, so the ask is looked at just before the next one, or at the end.
      const lastWords = aloud(ask).at(-1)?.end ?? Infinity;
      const settledAt = Math.min(lastWords + 500, nextStart - 200);
      verdicts.push(...await trail(seen, ask, circled, where), ...await pictureSent(ask, circled !== null, flow.display), ...await inked(seen, ask, step.expect, truth, settledAt, where, nextStart),
        ...await drawnIn(seen, ask, where, nextStart));
    }
  }
  // A look with no key: a page it has read, asked about once, is given by the record under the look's own name;
  // a later look at the same page (the mark moving) is held to the page of the look before it.
  const lookSteps = numbered.filter(({ step }) => "look" in step);
  let asked: PageRead[] = [];

  for (const [index, { step, truth }] of lookSteps.entries()) {
    const seenLook = seenLooks[index];
    if (!seenLook) throw new Error(`${scenario.id}: the run holds ${seenLooks.length} looks, and the scenario has ${lookSteps.length}`);
    if (!("look" in step)) continue;
    const name = first(seenLook.moments, "say")?.id.split(":")[0] ?? "";
    asked = given.get(name) ?? asked;
    verdicts.push(...glanced(seenLook, step.expect, truth, { pages: readBy(name, seenLook.at), ranOn: ran, forThis: asked }));
    if (filmed) verdicts.push(...wayDrawn("C18", seenLook.index, seenLook.moments, step.expect, where, truth, flow.display));
    const drawnBoard = lastBoard(seenLook.moments, name);
    verdicts.push(...readable("C18", seenLook.index, drawnBoard.rows, drawnBoard.card, boardLook, drawnBoard.type));
    if (step.page) verdicts.push(pageChanged(seenLook.index, standingBefore(everything, { down: seenLook.at, moments: seenLook.moments }).length));
  }
  if (all.length === 0) throw new Error(`${scenario.id}: the run holds no ask; a scenario needs one so its ending can be judged`);
  const last = all[all.length - 1];   // the loop above threw if the run held fewer asks than the scenario
  const closed = of(last.moments, "close").length > 0;
  verdicts.push(...(closed ? closing(last) : ending(last, true)));
  if (seen) verdicts.push(...await atEnd(seen, last, closed));
  verdicts.push(...await readings(scenario.id, dir));
  const frames = filmed ? await frameCount(dir) - 1 : 0;
  if (filmed) await film(dir, existsSync(join(dir, "voice.wav")));
  const spend = join(dir, "spend.json");
  const judged: Judged = {
    scenario, verdicts, stills: filmed ? await stills(dir, all, frames) : [],
    says: all.flatMap((ask) => [`(ask ${ask.index + 1}) he said: ${of(ask.moments, "heard").at(-1)?.text ?? ""}`, ...of(ask.moments, "say").map((m) => m.text)]),
    spentUsd: existsSync(spend) ? (await read(spend, z.object({ usd: z.number() }))).usd : null,
    ranAt: ran.toLocaleString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 16),
    app: await appCommit(),
  };
  await writeFile(join(dir, "verdicts.json"), JSON.stringify(judged, null, 2));
  return judged;
}
