import { keyLabel } from "./judge/label.ts";
import type { Placed } from "./session.ts";
import type { Ask } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C28, the label that names the key. Each run here is made up, with one fault planted in it,
// to prove that the check can fail.
const ASK: Ask = { index: 0, moments: [], down: 1000, up: 4000 };
const capsule = (at: number, look: string, w = 234): Placed => ({ at, what: "capsule", look, box: { x: 864 - w / 2, y: 1039, w, h: 50 } });
/** The label under the capsule, as the film lists it: its words, and where it is. Empty words: it has gone. */
const label = (at: number, text: string, box = { x: 814, y: 1093, w: 100, h: 16 }): Placed => ({ at, what: "label", text, box });
// One ask as the film records it: the circle, listening while he holds, thinking at release, speaking, then the circle.
const CAPSULE = [capsule(0, "rest", 46), capsule(1033, "listening", 82), capsule(4033, "thinking"), capsule(5000, "speaking"), capsule(20000, "rest", 46)];
const GOOD = [label(4033, "Working on it"), label(5000, "Hold right Option to ask"), label(20000, "")];
const judged = (labels: Placed[]) => keyLabel(ASK, [...CAPSULE, ...labels].sort((a, b) => a.at - b.at), Infinity);

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
  { name: "the key is named but it never says it is working", check: WORKING, mustPass: false, verdicts: () => judged([label(5000, "Hold right Option to ask"), label(20000, "")]) },
  { name: "it says it is working two seconds after he lets go", check: WORKING, mustPass: false, verdicts: () => judged([label(6000, "Working on it"), label(7000, "Hold right Option to ask"), label(20000, "")]) },
  { name: "the label says Listening while it speaks", check: NAMES, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Listening"), label(20000, "")]) },
  { name: "the label says to hold a key and does not say which", check: NAMES, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Hold to talk"), label(20000, "")]) },
  { name: "the label lies over the capsule's words", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Hold right Option to ask", { x: 814, y: 1050, w: 100, h: 16 }), label(20000, "")]) },
  { name: "the label is at the top of the screen", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Hold right Option to ask", { x: 814, y: 20, w: 100, h: 16 }), label(20000, "")]) },
  { name: "the label is as tall as the capsule", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Hold right Option to ask", { x: 764, y: 1093, w: 200, h: 50 }), label(20000, "")]) },
  { name: "the label is off to the left of the capsule", check: BESIDE, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Hold right Option to ask", { x: 640, y: 1056, w: 100, h: 16 }), label(20000, "")]) },
  { name: "it tells him to hold the key while he is holding it", check: HOLDING, mustPass: false, verdicts: () => judged([label(1033, "Hold right Option to ask"), label(4033, "Working on it"), label(5000, "Hold right Option to ask"), label(20000, "")]) },
  { name: "the last answer's label is still up a second into his next press", check: HOLDING, mustPass: false, verdicts: () => judged([label(0, "Hold right Option to ask"), label(2000, ""), label(4033, "Working on it"), label(5000, "Hold right Option to ask"), label(20000, "")]) },
  { name: "the label stays beside the resting circle", check: REST, mustPass: false, verdicts: () => judged([label(4033, "Working on it"), label(5000, "Hold right Option to ask")]) },
];
