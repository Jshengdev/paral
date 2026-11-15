import { count } from "../pixels.ts";
import type { Placed } from "../session.ts";
import type { Box } from "../shape.ts";
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
// The ink is counted from the least there was as the mark began: nothing, for a mark on a clean line; and for a
// mark that takes the place of one on the same line ("show me" boxes the line the look had boxed), what was left
// when the old one was wiped. Counted from before the wipe, such a mark grew by nothing and was never judged.
// The assistant's cursor rides the pen, so its body arrives in the mark's room in one frame as the ink starts and
// leaves when it steps aside. It is not the mark's ink: where the film's record says the cursor is at a moment
// (`pointers`), those pixels are left out of the count. (A cursor counted as ink read as a mark popping in.)
async function penTime(seen: Seen, mark: Placed, pointers: Placed[]): Promise<number | null> {
  const box = { x: mark.box.x - ROOM, y: mark.box.y - ROOM, w: mark.box.w + 2 * ROOM, h: mark.box.h + 2 * ROOM };
  const within = (other: Box): Box | null => {
    const x = Math.max(box.x, other.x), y = Math.max(box.y, other.y);
    const w = Math.min(box.x + box.w, other.x + other.w) - x, h = Math.min(box.y + box.h, other.y + other.h) - y;
    return w > 0 && h > 0 ? { x, y, w, h } : null;
  };
  const samples: { ms: number; ink: number }[] = [];
  for (let ms = mark.at - BEFORE_MS; ms <= mark.at + AFTER_MS; ms += STEP_MS) {
    const ink = await seen.ink(ms);
    const cursor = pointers.filter((p) => p.at <= ms).at(-1);
    const shared = cursor ? within(cursor.box) : null;
    samples.push({ ms, ink: count(ink, seen.size, box) - (shared ? count(ink, seen.size, shared) : 0) });
  }
  const began = samples.filter((s) => s.ms <= mark.at + 2 * STEP_MS);
  const least = began.reduce((low, s) => (s.ink <= low.ink ? s : low));
  const grown = samples.filter((s) => s.ms >= least.ms).map((s) => ({ ms: s.ms, ink: s.ink - least.ink }));
  const full = grown[grown.length - 1].ink;   // the window always holds at least one sample
  if (full < FEW) return null;
  // The last sample holds all the ink, so some sample always reaches any share of it.
  const reached = (share: number) => (grown.find((s) => s.ink >= full * share) ?? grown[grown.length - 1]).ms;
  return reached(0.9) - reached(0.1);
}

export async function drawnIn(seen: Seen, ask: Ask, placed: Placed[], until: number): Promise<Verdict[]> {
  const mine = placed.filter((p) => (p.what === "mark" || p.what === "echo") && p.at >= ask.down && p.at < until);
  const pointers = placed.filter((p) => p.what === "pointer");
  const times = (await Promise.all(mine.map((mark) => penTime(seen, mark, pointers)))).filter((ms): ms is number => ms !== null);
  if (times.length === 0) return [];
  const what = "Each mark is drawn by a pen over time, never popped in";
  const measured = `${times.length} drawn, the pen took ${times.map((ms) => Math.round(ms)).join(", ")} ms`;
  const limit = `over ${POPPED_MS} ms and under ${SLOW_MS} ms (Nielsen: 0.1 s reads as instant, 1 s holds the eye)`;
  return [times.every((ms) => ms > POPPED_MS && ms < SLOW_MS) ? yes("U7", ask.index, what, measured, limit) : no("U7", ask.index, what, measured, limit)];
}
