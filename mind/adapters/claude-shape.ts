import { z } from "zod";
import type { Asked } from "../ports.ts";

// What is asked of Claude for one answer, and the shape its reply must have.

export const Mark = z
  .object({
    kind: z.enum(["ring", "underline", "wavy", "bracket"]),
    index: z.number().int().nullable(),
    quote: z.string(),
    label: z.string().nullable(),
    toIndex: z.number().int().nullable(),
    toQuote: z.string().nullable(),
  })
  .nullable();

// The order is the order the model writes in. The board comes before the sentences and a mark before its words, so
// each can be shown the moment it is whole, ahead of the sentence it goes with.
export const Reply = z.object({
  problem: z.string(),
  breakIndex: z.number().int().nullable(),
  breakLine: z.string().nullable(),
  result: z.string().nullable(),
  lesson: z.string().nullable(),
  board: z.array(z.array(z.string())).nullable(),
  beats: z.array(z.object({ mark: Mark, say: z.string() })),
});

/** The words of the request: what he said, what was read from his screen, the lesson so far, and the rung to write for. */
export function asking(asked: Asked): string {
  const { lesson, rung } = asked;
  return [
    `What the student just said: "${asked.words}"`,
    // A line with no words is one outside the part he drew around: its words never left his Mac. The numbers stay the same.
    `Lines read from the screen:\n${asked.lines.flatMap((line, index) => (line ? [`${index}: ${line}`] : [])).join("\n") || "(none were read)"}`,
    ...(asked.circled.length > 0
      ? [`As they spoke, the student drew around line${asked.circled.length === 1 ? "" : "s"} ${asked.circled.join(", ")}; the path is drawn on the picture. "This", "that" and "here" mean what they drew around.`]
      : []),
    [
      "The lesson so far:",
      `- problem: ${lesson.problem ?? "not read yet"}`,
      `- the line found wrong last time: ${lesson.breakLine ?? "none yet"}`,
      `- what the student said before: ${lesson.tried.join(" | ") || "nothing yet"}`,
      `- lines already shown to the student: ${lesson.shown.join(" | ") || "none"}`,
      `- drawn by you earlier and still on their screen: ${lesson.drawn.join("; ") || "nothing"}`,
    ].join("\n"),
    `Write the hint for this rung: ${rung.name}. ${rung.may} ${rung.sentences === 1 ? "One sentence." : `At most ${rung.sentences} sentences.`}${asked.fresh ? " The student has seen this rung before for this line, so use new words." : ""}`,
    asked.lessons.length > 0
      ? `Lessons you can show as a short clip (set "lesson" to one of these names when it fits, otherwise null):\n${asked.lessons.map((lesson) => `- ${lesson.name}: ${lesson.idea}`).join("\n")}`
      : 'No lesson clip can be shown now, so set "lesson" to null.',
    `If the student's work has a wrong line, they hear this just before your hint: "${asked.leadIn}" Do not say it again; carry on from it.`,
  ].join("\n\n");
}
