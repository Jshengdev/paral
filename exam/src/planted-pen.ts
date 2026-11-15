import { drawnIn } from "./judge/motion.ts";
import type { Ask } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of the pen: is a mark drawn over time, or does it pop in? Each film here is made of numbers.
const box = { x: 100, y: 80, w: 200, h: 20 };
/** An ask that holds nothing; the pen check reads only when it began. */
const ASKED: Ask = { index: 0, moments: [], down: 0, up: 3000 };

// A film made of numbers: the mark's box fills from left to right as `grow` says, from nothing to all of it.
const size = { w: 400, h: 200 };
function film(grow: (ms: number) => number) {
  const filled = (share: number) => {
    const ink = new Uint8Array(size.w * size.h);
    const columns = Math.round(box.w * Math.max(0, Math.min(1, share)));
    for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + columns; x++) ink[y * size.w + x] = 1;
    return ink;
  };
  return { size, ink: async (ms: number) => filled(grow(ms)), cover: async (ms: number) => filled(grow(ms)), changed: async () => filled(0), last: async () => filled(1), restZone: box };
}

export const PEN_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] | Promise<Verdict[]> }[] = [
  { name: "a mark that pops in", check: "Each mark is drawn by a pen", mustPass: false, verdicts: () => drawnIn(film((ms) => (ms >= 1000 ? 1 : 0)), ASKED, [{ at: 1000, what: "mark", id: "t1/0", box }], Infinity) },
  { name: "a box wiped and drawn again on the same line, in 400 ms", check: "Each mark is drawn by a pen", mustPass: true, verdicts: () => drawnIn(film((ms) => (ms < 1000 ? 1 : (ms - 1000) / 400)), ASKED, [{ at: 1000, what: "mark", id: "t2/0", box }], Infinity) },
  { name: "a box wiped and popped back on the same line", check: "Each mark is drawn by a pen", mustPass: false, verdicts: () => drawnIn(film((ms) => (ms < 1000 ? 1 : ms < 1067 ? 0 : 1)), ASKED, [{ at: 1000, what: "mark", id: "t2/0", box }], Infinity) },
  { name: "a ring drawn in 400 ms that pulses a second later while it waits", check: "Each mark is drawn by a pen", mustPass: true, verdicts: () => drawnIn(film((ms) => (ms < 2100 ? 0.7 * Math.min(1, (ms - 1000) / 400) : 1)), ASKED, [{ at: 1000, what: "mark", id: "t1/0", box }], Infinity) },
  { name: "a ring drawn in 0.9 s whose ink dips as the cursor's tag passes through its room", check: "Each mark is drawn by a pen", mustPass: true, verdicts: () => drawnIn(film((ms) => (ms < 950 ? 0 : ms < 1150 ? 0.38 : ms < 1300 ? 0.33 : Math.min(1, 0.33 + (ms - 1300) / 900))), ASKED, [{ at: 1000, what: "mark", id: "t1/0", box }], Infinity) },
  { name: "a mark drawn in 400 ms", check: "Each mark is drawn by a pen", mustPass: true, verdicts: () => drawnIn(film((ms) => (ms - 1000) / 400), ASKED, [{ at: 1000, what: "mark", id: "t1/0", box }], Infinity) },
];
