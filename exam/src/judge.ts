import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { Judged } from "./explain.ts";
import { film, frameAt, frameCount, still } from "./film.ts";
import { board, lesson } from "./judge/board.ts";
import { closing, cutIn, ending } from "./judge/ending.ts";
import { atEnd, atRest, inked, look, thinkingShown, trail } from "./judge/frames.ts";
import { marks } from "./judge/marks.ts";
import { pathInPicture } from "./judge/picture.ts";
import { drawnIn } from "./judge/motion.ts";
import { thinkingSaid, timing } from "./judge/timing.ts";
import { spoken, voiced } from "./judge/words.ts";
import { runDir } from "./prepare.ts";
import { readings } from "./readings.ts";
import { moments, placed } from "./session.ts";
import { sound } from "./sound.ts";
import { Flow, Truth, findNamed, type Box, type Scenario } from "./shape.ts";
import { asks, first, of, spoken as aloud, type Ask } from "./timeline.ts";
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

export async function judge(scenario: Scenario): Promise<Judged> {
  const dir = runDir(scenario.id);
  const truth = await read(join(dir, "truth.json"), z.array(Truth));
  const flow = await read(join(dir, "flow.json"), Flow);
  const all = asks(await moments(dir));
  const where = await placed(dir);
  const filmed = existsSync(join(dir, "frames"));
  const seen = filmed ? await look(dir, flow.display) : null;
  const voice = existsSync(join(dir, "voice.wav")) ? await sound(join(dir, "voice.wav")) : null;
  const verdicts: Verdict[] = seen ? await atRest(seen) : [];
  const steps = scenario.steps.filter((step) => "say" in step);
  for (const [index, step] of steps.entries()) {
    const ask = all[index];
    if (!ask) throw new Error(`${scenario.id}: the run holds ${all.length} asks, and the scenario has ${steps.length}`);
    if (!("say" in step)) continue;
    if (step.say !== "") verdicts.push(...timing(ask, step.expect, where), ...(seen ? await thinkingShown(seen, ask, where) : thinkingSaid(ask)));
    verdicts.push(...marks(ask, step.expect, truth), ...spoken(ask, step.expect, truth), ...voiced(ask, step.expect, all[index + 1]?.down ?? null),
      ...board(ask, step.expect, truth, where), ...lesson(ask, step.expect), ...cutIn(ask, all[index - 1] ?? null, step.expect, voice));
    if (seen) {
      const circled = step.circle === null ? null : boxOf(truth, step.circle, scenario.id);
      // With no voice there is no last word to wait for, so the ask is looked at just before the next one, or at the end.
      const lastWords = aloud(ask).at(-1)?.end ?? Infinity;
      const settledAt = Math.min(lastWords + 500, (all[index + 1]?.down ?? Infinity) - 200);
      verdicts.push(...await trail(seen, ask, circled, where), ...await pathInPicture(ask, circled, flow.display), ...await inked(seen, ask, step.expect, truth, settledAt, where, all[index + 1]?.down ?? Infinity),
        ...await drawnIn(seen, ask, where, all[index + 1]?.down ?? Infinity));
    }
  }
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
    ranAt: (await stat(join(dir, "session.jsonl"))).mtime.toLocaleString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 16),
  };
  await writeFile(join(dir, "verdicts.json"), JSON.stringify(judged, null, 2));
  return judged;
}
