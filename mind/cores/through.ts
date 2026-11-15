import { boxes } from "./beats.ts";
import { asksFor } from "./catch.ts";

/**
 * Whether an ask is a step of working the exercise through: only when the switch is on, a measured drawing is on his
 * screen, and his own words ask for it. Anything else is an ordinary ask, and a plain ask for the answer still a hint.
 */
export function worksThrough(on: boolean, words: string, phrases: string[], drawing: boolean): boolean {
  return on && drawing && asksFor(words, phrases);
}

/** The board of the working so far: one step a row, in the order they were given, the newest last and lit. */
export function stepsBoard(steps: string[]): { rows: string[][]; now: number } {
  const rows = boxes(steps.map((step) => [step]));
  return { rows, now: rows.length - 1 };
}
