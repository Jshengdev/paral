import { keyLabel } from "./judge/label.ts";
import type { Placed } from "./session.ts";
import type { Ask } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C28, the label that names the key. Each run here is made up, with one fault planted in it,
// to prove that the check can fail.
const ASK: Ask = { index: 0, moments: [], down: 1000, up: 4000 };
const capsule = (at: number, look: string, w = 234): Placed => ({ at, what: "capsule", look, box: { x: 864 - w / 2, y: 1039, w, h: 50 } });
/** The label under the capsule, as the film lists it: what it says, and where it is. Null: it has gone. */
const label = (at: number, says: string | null, box = { x: 814, y: 1093, w: 100, h: 16 }): Placed => ({ at, what: "label", says, box });
// One ask as the film records it: the circle, listening while he holds, thinking at release, speaking, then the circle.
const CAPSULE = [capsule(0, "rest", 46), capsule(1033, "listening", 82), capsule(4033, "thinking"), capsule(5000, "speaking"), capsule(20000, "rest", 46)];
const GOOD = [label(4033, "On it"), label(5000, "Hold right option to talk"), label(20000, null)];
const judged = (labels: Placed[], key: string | null = "rightOption") => keyLabel(ASK, [...CAPSULE, ...labels].sort((a, b) => a.at - b.at), Infinity, key);

const WORKING = "For a moment after he lets go, a small label says it is working";
const NAMES = "While its own words show, the label names the key to hold";
const BESIDE = "The label sits close beside the capsule, smaller than it, and not over it";
const HOLDING = "While he holds the key, the label does not tell him to hold it";
const REST = "The circle alone carries no label";

export const LABEL_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "the label says it is working at release", check: WORKING, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the label names the key while it speaks", check: NAMES, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the label sits under the capsule, a third of its height", check: BESIDE, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the label is gone while he holds the key", check: HOLDING, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "the label goes when the circle is alone again", check: REST, mustPass: true, verdicts: () => judged(GOOD) },
  { name: "no label at all, as the build draws today", check: WORKING, mustPass: false, verdicts: () => judged([]) },
  { name: "no label at all while it speaks", check: NAMES, mustPass: false, verdicts: () => judged([]) },
  { name: "the key is named but it never says it is working", check: WORKING, mustPass: false, verdicts: () => judged([label(5000, "Hold right option to talk"), label(20000, null)]) },
  { name: "it says it is working two seconds after he lets go", check: WORKING, mustPass: false, verdicts: () => judged([label(6000, "On it"), label(7000, "Hold right option to talk"), label(20000, null)]) },
  { name: "the label says Listening while it speaks", check: NAMES, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Listening"), label(20000, null)]) },
  { name: "the label says to hold a key and does not say which", check: NAMES, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold to talk"), label(20000, null)]) },
  { name: "the label names an Option key and does not say which of the two", check: NAMES, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold option to talk"), label(20000, null)]) },
  { name: "the run listens on fn and the label names the right Option key", check: NAMES, mustPass: false, verdicts: () => judged(GOOD, "fn") },
  { name: "the run listens on fn and the label names fn", check: NAMES, mustPass: true, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold fn to talk"), label(20000, null)], "fn") },
  { name: "the label lies over the capsule's words", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold right option to talk", { x: 814, y: 1050, w: 100, h: 16 }), label(20000, null)]) },
  { name: "the label is at the top of the screen", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold right option to talk", { x: 814, y: 20, w: 100, h: 16 }), label(20000, null)]) },
  { name: "the label is as tall as the capsule", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold right option to talk", { x: 764, y: 1093, w: 200, h: 50 }), label(20000, null)]) },
  { name: "the label is off to the left of the capsule", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold right option to talk", { x: 640, y: 1056, w: 100, h: 16 }), label(20000, null)]) },
  { name: "it tells him to hold the key while he is holding it", check: HOLDING, mustPass: false, verdicts: () => judged([label(1033, "Hold right option to talk"), label(4033, "On it"), label(5000, "Hold right option to talk"), label(20000, null)]) },
  { name: "the last answer's label is still up a second into his next press", check: HOLDING, mustPass: false, verdicts: () => judged([label(0, "Hold right option to talk"), label(2000, null), label(4033, "On it"), label(5000, "Hold right option to talk"), label(20000, null)]) },
  { name: "the label stays beside the resting circle", check: REST, mustPass: false, verdicts: () => judged([label(4033, "On it"), label(5000, "Hold right option to talk")]) },
];
