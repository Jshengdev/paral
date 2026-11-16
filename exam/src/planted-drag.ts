import { dragged } from "./judge/drag.ts";
import type { Placed } from "./session.ts";
import type { Ask } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C26, a board he can drag. Each run here is made up, with one fault planted in it, to prove
// that the check can fail. The drag is 120 points to the right and 180 up, as the video's goes up and to the right.
const ASK: Ask = { index: 0, moments: [], down: 0, up: 3000 };
const BY: [number, number] = [120, -180];
const board = (at: number, x: number, y: number, h = 90): Placed => ({ at, what: "board", id: "t1", box: { x, y, w: 420, h } });
const strip = (x: number, y: number): Placed => ({ at: 5000, what: "strip", id: "t1/strip", box: { x: x + 180, y: y + 6, w: 60, h: 6 } });
/** The board opens at 600, 600, is dragged in `steps` moves from 9 s to 10.5 s, then grows a row at 12 s and at 16 s. */
function run(to: [number, number] = [720, 420], steps = 6, grown: [number, number] = to): Placed[] {
  const out = [board(5000, 600, 600)];
  for (let n = 1; n <= steps; n++) out.push(board(9000 + n * 250, 600 + ((to[0] - 600) * n) / steps, 600 + ((to[1] - 600) * n) / steps));
  return [...out, board(12000, grown[0], grown[1], 140), board(16000, grown[0], grown[1], 190)];
}
const judged = (drawn: Placed[]) => dragged(ASK, { drag: { by: BY } }, drawn.sort((a, b) => a.at - b.at), Infinity);

const MOVED = "Dragged by its strip, the board goes where his pointer goes";
const WITH = "It moves with his pointer, not in one jump";
const STAYS = "It stays where he let go, and what is drawn next is drawn there";
const STRIP = "The board has a strip at its top to take hold of";

export const DRAG_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "dragged up and to the right, it lands there", check: MOVED, mustPass: true, verdicts: () => judged([...run(), strip(720, 420)]) },
  { name: "it passes through six places on the way", check: WITH, mustPass: true, verdicts: () => judged([...run(), strip(720, 420)]) },
  { name: "two more rows are drawn where he left it", check: STAYS, mustPass: true, verdicts: () => judged([...run(), strip(720, 420)]) },
  { name: "a strip in the top of the card", check: STRIP, mustPass: true, verdicts: () => judged([...run(), strip(720, 420)]) },
  { name: "the board does not move, as the build draws today", check: MOVED, mustPass: false, verdicts: () => judged([board(5000, 600, 600), board(12000, 600, 600, 140), board(16000, 600, 600, 190)]) },
  { name: "it moves half as far as he dragged", check: MOVED, mustPass: false, verdicts: () => judged([...run([660, 510]), strip(660, 510)]) },
  { name: "the press beside the strip moves it too", check: MOVED, mustPass: false, verdicts: () => judged([...run([720, 420], 6, [760, 420]), strip(760, 420)]) },
  { name: "it jumps to where he let go", check: WITH, mustPass: false, verdicts: () => judged([...run([720, 420], 1), strip(720, 420)]) },
  { name: "it goes back to where it opened when the next row is drawn", check: MOVED, mustPass: false, verdicts: () => judged([...run([720, 420], 6, [600, 600]), strip(600, 600)]) },
  { name: "it shifts when the next row is drawn, then comes back", check: STAYS, mustPass: false, verdicts: () => judged([...run().slice(0, 7), board(12000, 726, 420, 140), board(16000, 720, 420, 190), strip(720, 420)]) },
  { name: "no strip is named", check: STRIP, mustPass: false, verdicts: () => judged(run()) },
  { name: "the strip is at the foot of the card", check: STRIP, mustPass: false, verdicts: () => judged([...run(), { at: 5000, what: "strip", id: "t1/strip", box: { x: 900, y: 600, w: 60, h: 6 } }]) },
];
