import { dimLine } from "./judge/thought.ts";
import type { Placed } from "./session.ts";
import type { Ask, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C29, the dim line while it thinks. Each run here is made up, with one fault planted in it,
// to prove that the check can fail.
const FIXED = ["Okay, let me look.", "Okay, let's look at it again."];
const OLDER = "Let's look through your plan.";
const NEWEST = "Let's look through the file layout in your plan.";
const thought = (at: number, text: string, heard: number): Moment => ({ at, kind: "thought", text, heard });
const line = (at: number, text: string): Moment => ({ at, kind: "say", id: "t1:-1", text, opener: true, hint: false, top: false });
const sound = (at: number): Moment => ({ at, kind: "voice", of: "t1:-1", ms: 1800 });
// He holds from 1000 to 4000. Two drafts' lines are sent while he talks; a third is stamped after his finger lifted.
const SENT = [thought(2500, OLDER, 6), thought(3500, NEWEST, 9), thought(4200, "Let's look at the whole plan again.", 14)];
// Its own line is said 430 ms after the release and heard 110 ms later; the fixed line is heard with its words.
const ITS_OWN = [line(4430, NEWEST), sound(4540)];
const hold = (moments: Moment[]): Ask => ({ index: 0, moments: [...moments].sort((a, b) => a.at - b.at), down: 1000, up: 4000 });
/** The dim line as the film lists it: what it says, in the bubble's box. Null: it has gone. */
const dim = (at: number, says: string | null): Placed => ({ at, what: "thought", says, box: { x: 700, y: 980, w: 330, h: 41 } });
const capsule: Placed = { at: 0, what: "capsule", look: "rest", box: { x: 841, y: 1043, w: 46, h: 46 } };
const judged = (moments: Moment[], film: Placed[], expect = {}) => dimLine(hold(moments), expect, [capsule, ...film], 20000, FIXED);
const GOOD = [dim(4010, NEWEST), dim(4545, null)];
// Each check is named by how its words begin, as the judge's own test reads them.
const [SHOWS, QUIET, GOES, SAME, ONLY, HEARD] = ["A line written while he talked shows dim", "No dim line while he is still talking", "The dim line goes when its first line is said", "After a dim line he hears", "A dim line is only a line the mind sent", "Only a draft that heard six words"];

export const THOUGHT_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "the newest line sent by the release shows dim as he lets go", check: SHOWS, mustPass: true, verdicts: () => judged([...SENT, ...ITS_OWN], GOOD) },
  { name: "the dim line comes a third of a second after he lets go, as the stash was first written", check: SHOWS, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [dim(4330, NEWEST), dim(4545, null)]) },
  { name: "a line was sent and none is shown, as the build draws today", check: SHOWS, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], []) },
  { name: "a long question and no line sent by the release", check: SHOWS, mustPass: false, verdicts: () => judged([line(4500, FIXED[0]), sound(4502)], [], { dimLine: true }) },
  { name: "the dim line is up while he is still talking", check: QUIET, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [dim(3520, NEWEST), dim(4545, null)]) },
  { name: "nothing is sent and nothing is shown", check: QUIET, mustPass: true, verdicts: () => judged([line(4500, FIXED[0]), sound(4502)], []) },
  { name: "it goes as its own line begins to be heard", check: GOES, mustPass: true, verdicts: () => judged([...SENT, ...ITS_OWN], GOOD) },
  { name: "the dim line is still up two seconds into the line being said", check: GOES, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [dim(4010, NEWEST), dim(6600, null)]) },
  { name: "the dim line is never taken down", check: GOES, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [dim(4010, NEWEST)]) },
  { name: "the dim line goes and comes back while the answer is said", check: GOES, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [...GOOD, dim(7000, NEWEST), dim(7400, null)]) },
  { name: "he presses again before any line is said, and the dim line goes with it", check: GOES, mustPass: true, verdicts: () => judged(SENT, [dim(4010, NEWEST), dim(4300, null)]) },
  { name: "after the dim line he hears the same line", check: SAME, mustPass: true, verdicts: () => judged([...SENT, ...ITS_OWN], GOOD) },
  { name: "the draft did not fit and he hears the fixed line", check: SAME, mustPass: true, verdicts: () => judged([...SENT, line(4500, FIXED[0]), sound(4502)], [dim(4010, NEWEST), dim(4505, null)]) },
  { name: "after the dim line he hears another line of its own", check: SAME, mustPass: false, verdicts: () => judged([...SENT, line(4430, OLDER), sound(4540)], GOOD) },
  { name: "the older draft's line is the one shown", check: ONLY, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [dim(4010, OLDER), dim(4545, null)]) },
  { name: "the line stamped after his finger lifted is the one shown", check: ONLY, mustPass: false, verdicts: () => judged([...SENT, ...ITS_OWN], [dim(4010, SENT[2].kind === "thought" ? SENT[2].text : ""), dim(4545, null)]) },
  { name: "a dim line nobody sent, on a circle with no words", check: ONLY, mustPass: false, verdicts: () => judged([], [dim(4010, "Let's look at this page."), dim(4400, null)]) },
  { name: "every line sent had heard six words or more", check: HEARD, mustPass: true, verdicts: () => judged([...SENT, ...ITS_OWN], GOOD) },
  { name: "a draft of four words is sent to be shown", check: HEARD, mustPass: false, verdicts: () => judged([thought(2000, "Let's look at the stats page.", 4), ...SENT, ...ITS_OWN], GOOD) },
];
