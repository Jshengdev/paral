import { pointerAtMarks } from "./judge/pointer.ts";
import type { Placed } from "./session.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C30, its own pointer at each mark. Each film here is made up, with one fault planted in it,
// to prove that the check can fail.
const mark = (at: number, id: string, y: number, w: number): Placed => ({ at, what: "mark", id, box: { x: 300, y, w, h: 3 } });
/** The pointer as the film lists it: 36 points across, named by its middle. */
const pointer = (at: number, x: number, y: number): Placed => ({ at, what: "pointer", box: { x: x - 18, y: y - 18, w: 36, h: 36 } });
// An underline that grows from 100 to 600 points wide in 0.4 s.
const UNDERLINE = [mark(5000, "t1/1", 400, 100), mark(5200, "t1/1", 400, 350), mark(5400, "t1/1", 400, 600)];
// The pointer leaves the capsule, reaches the underline's start as it begins, and follows it to its far end.
const FLIES = [pointer(4600, 864, 1040), pointer(4800, 600, 700), pointer(4950, 310, 402), pointer(5200, 650, 402), pointer(5400, 900, 402)];
const BY_THE_CAPSULE = [pointer(4600, 864, 1040), pointer(5400, 860, 1036)];
const SECOND = mark(9000, "t1/2", 430, 620);
const judged = (rows: Placed[]) => pointerAtMarks(0, 1000, Infinity, [...rows].sort((a, b) => a.at - b.at));
const CHECK = "Its own pointer is at each mark";

export const POINTER_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "the pointer flies from the capsule to the underline and follows it", check: CHECK, mustPass: true, verdicts: () => judged([...UNDERLINE, ...FLIES]) },
  { name: "a mark is drawn and the pointer stays by the capsule", check: CHECK, mustPass: false, verdicts: () => judged([...UNDERLINE, ...BY_THE_CAPSULE]) },
  { name: "the pointer comes to the mark two seconds after it was drawn", check: CHECK, mustPass: false, verdicts: () => judged([...UNDERLINE, ...BY_THE_CAPSULE, pointer(7000, 310, 402)]) },
  { name: "two marks, and the pointer comes only to the first", check: CHECK, mustPass: false, verdicts: () => judged([...UNDERLINE, ...FLIES, { ...SECOND, box: { ...SECOND.box, y: 800 } }]) },
  { name: "a second mark close by, and the pointer crosses to it", check: CHECK, mustPass: true, verdicts: () => judged([...UNDERLINE, ...FLIES, SECOND, pointer(9033, 905, 432)]) },
  { name: "marks on film and no pointer in it at all", check: CHECK, mustPass: false, verdicts: () => judged(UNDERLINE) },
];
