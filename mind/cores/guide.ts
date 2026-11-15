/** One step of the demo's guide for a page: the words shown, and what must be seen to happen for it to count as done. */
export type Step = { text: string; when: string };

/**
 * Something the mind saw happen: a look showed its line on a page, with its mark on the thing's own line, on the
 * heading it sits under, or on nothing; a "show me" step was given; a date was kept; an ask was answered.
 */
export type Noted = { kind: "look"; on: "line" | "heading" | "nothing" } | { kind: "showme" } | { kind: "kept" } | { kind: "asked"; words: string };

/** What has been seen to happen on one page so far. */
export type Seen = { look: boolean; heading: boolean; line: boolean; showme: number; kept: boolean; asked: string[] };
export const nothingYet: Seen = { look: false, heading: false, line: false, showme: 0, kept: false, asked: [] };

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** What has been seen, with one more thing. A mark on the line means its heading was reached too. */
export function note(seen: Seen, what: Noted): Seen {
  switch (what.kind) {
    case "look":
      return { ...seen, look: true, heading: seen.heading || what.on !== "nothing", line: seen.line || what.on === "line" };
    case "showme":
      return { ...seen, showme: seen.showme + 1 };
    case "kept":
      return { ...seen, kept: true };
    case "asked":
      return { ...seen, asked: [...seen.asked, plain(what.words)] };
  }
}

/**
 * Whether a step has happened. Its `when` is one of: "look" (the look showed its line), "heading" (the mark reached
 * the heading), "line" (the mark is on the thing's own line), "showme" and "showme again" (a first and a second step
 * of the walk), "kept" (a date was kept), or "asked WORDS" (an ask holding those words was answered).
 */
export function happened(when: string, seen: Seen): boolean {
  if (when.startsWith("asked ")) return seen.asked.some((words) => words.includes(plain(when.slice(6))));
  return { look: seen.look, heading: seen.heading, line: seen.line, showme: seen.showme >= 1, "showme again": seen.showme >= 2, kept: seen.kept }[when] ?? false;
}

/** The first step not yet done, counted from 0, whatever order he did the others in; -1 when all are done. */
export function nextStep(steps: Step[], seen: Seen): number {
  return steps.findIndex((step) => !happened(step.when, seen));
}

/** A step toward his goal, as a look found it on the page: what to do, and by when if the page says. */
export type Toward = { step: string; by?: string };

/**
 * The guide's line once he has a goal, which is the first thing he asked on this page: the steps the looks found on
 * the page are the goal's instructions, and the walk counts them. The step he is on is the one "show me" (or a click
 * on its box) last gave him, and the first before any. `past` is true once he has walked past the last. Null while
 * he has asked nothing here or no steps are known, and then the page's own list stands.
 */
export function towardGoal(steps: Toward[], seen: Seen): { text: string; n: number; of: number; past: boolean } | null {
  if (seen.asked.length === 0 || steps.length === 0) return null;
  const on = Math.max(1, seen.showme);
  if (on > steps.length) return { text: "", n: steps.length, of: steps.length, past: true };
  const { step, by } = steps[on - 1];
  return { text: by ? `${step.replace(/\.$/, "")}, by ${by}` : step, n: on, of: steps.length, past: false };
}
