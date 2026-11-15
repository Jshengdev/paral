import { z } from "zod";
import type { Answered, Asked } from "../ports.ts";
import { heading, soFar } from "./claude-shape.ts";

// What is asked of Claude for one step of the working he asked to have worked through, and the shape of its reply.
// Used only when the switch is on and his words ask for it; every other ask is asked as `claude-shape.ts` says.

/** The order is the order the model writes in: what the step is before what is said of it. */
export const Walk = z.object({
  problem: z.string(),
  result: z.string().nullable(),
  last: z.boolean(),
  step: z.string(),
  spots: z.array(z.string()),
  beats: z.array(z.object({ say: z.string() })),
});

/** The words of the request for the next step: what every ask is told, the lesson so far, the steps given and the drawing's places. */
export function walking(asked: Asked & { walk: { steps: string[] } }, most: number): string {
  const { steps } = asked.walk;
  return [
    ...heading(asked),
    soFar(asked.lesson),
    steps.length === 0
      ? "They have asked you to work this exercise through with them, step by step. No step has been given yet: give the first step of its working, and only that one."
      : `They have asked you to work this exercise through with them, step by step. The steps you have already given, in order, each still on the board and its rings still on the drawing:\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}\nGive step ${steps.length + 1}: the one that comes right after step ${steps.length}, and only that one. Do not give a step above again.`,
    asked.spots.length > 0
      ? `The drawing of the exercise on their screen has these named places. Put in "spots" the names of the places this step is about, at most ${most}, and they are ringed on the drawing as you speak:\n${asked.spots.map((spot) => `- ${spot.name}: ${spot.what}`).join("\n")}`
      : 'No place of a drawing can be ringed now, so leave "spots" empty.',
  ].join("\n\n");
}

/** A step as the mind uses it: an answer with no wrong line, its sentences with no marks, and the step itself. */
export function walked(reply: z.infer<typeof Walk>, given: number): Answered {
  return {
    problem: reply.problem,
    breakLine: null,
    breakIndex: null,
    result: reply.result || null,
    lesson: null,
    board: null,
    beats: reply.beats.filter(({ say }) => say.trim() !== "").map(({ say }) => ({ say, mark: null })),
    spots: reply.spots.filter(Boolean),
    walk: { step: reply.step.trim() || `Step ${given + 1}`, last: reply.last },
  };
}
