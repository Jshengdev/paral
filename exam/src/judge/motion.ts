import { count } from "../pixels.ts";
import type { Placed } from "../session.ts";
import type { Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import type { Seen } from "./frames.ts";

const STEP_MS = 67;       // two frames of the film
const BEFORE_MS = 200;    // the count this long before a mark starts is what was already there
const AFTER_MS = 1400;    // by now the slowest pen in the tokens (650 ms) has long finished
const ROOM = 8;           // points round the mark's box, so the pen's width is counted too
const FEW = 30;           // drawn pixels below this are noise from scaling
const POPPED_MS = 100;    // Nielsen: a change under 0.1 s reads as instant, so ink that arrives faster was not drawn
const SLOW_MS = 1000;     // Nielsen: past 1 s the eye waits on the pen and stops following the voice

// A mark is drawn by a pen, so its ink grows. The pen's time is from a tenth of the mark's ink to nine tenths of it.
async function penTime(seen: Seen, mark: Placed): Promise<number | null> {
  const box = { x: mark.box.x - ROOM, y: mark.box.y - ROOM, w: mark.box.w + 2 * ROOM, h: mark.box.h + 2 * ROOM };
  const samples: { ms: number; ink: number }[] = [];
  for (let ms = mark.at - BEFORE_MS; ms <= mark.at + AFTER_MS; ms += STEP_MS) samples.push({ ms, ink: count(await seen.ink(ms), seen.size, box) });
  const grown = samples.map((s) => ({ ms: s.ms, ink: s.ink - samples[0].ink }));
  const full = grown.at(-1)!.ink;
  if (full < FEW) return null;
  const reached = (share: number) => grown.find((s) => s.ink >= full * share)!.ms;
  return reached(0.9) - reached(0.1);
}

export async function drawnIn(seen: Seen, ask: Ask, placed: Placed[], until: number): Promise<Verdict[]> {
  const mine = placed.filter((p) => (p.what === "mark" || p.what === "echo") && p.at >= ask.down && p.at < until);
  const times = (await Promise.all(mine.map((mark) => penTime(seen, mark)))).filter((ms): ms is number => ms !== null);
  if (times.length === 0) return [];
  const what = "Each mark is drawn by a pen over time, never popped in";
  const measured = `${times.length} drawn, the pen took ${times.map((ms) => Math.round(ms)).join(", ")} ms`;
  const limit = `over ${POPPED_MS} ms and under ${SLOW_MS} ms (Nielsen: 0.1 s reads as instant, 1 s holds the eye)`;
  return [times.every((ms) => ms > POPPED_MS && ms < SLOW_MS) ? yes("U7", ask.index, what, measured, limit) : no("U7", ask.index, what, measured, limit)];
}
