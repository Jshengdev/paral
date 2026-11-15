// The runners for rows about the guide's cores: what it says next from the page's own list, and from his goal.
import { nextStep, note, nothingYet, towardGoal, type Noted, type Seen, type Step, type Toward } from "../../mind/cores/guide.ts";

/** What the guide says next after each thing seen to happen, in turn: the step's words, or null when all are done. */
export function guideNext(input: { steps: Step[]; happens: Noted[] }) {
  let seen = nothingYet;
  return input.happens.map((what) => input.steps[nextStep(input.steps, (seen = note(seen, what)))]?.text ?? null);
}

/** The goal's line for each case of what has been seen (his asks, the walk's count), then with no steps known. */
export function guideGoal(input: { steps: Toward[]; cases: Partial<Seen>[]; none: Partial<Seen> }) {
  return [...input.cases.map((seen) => towardGoal(input.steps, { ...nothingYet, ...seen })), towardGoal([], { ...nothingYet, ...input.none })];
}
