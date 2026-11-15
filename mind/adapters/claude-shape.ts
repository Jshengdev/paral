import { z } from "zod";
import { datesIn, daysFrom, worded } from "../cores/dates.ts";
import type { KeptPage } from "../cores/page.ts";
import type { Part as Arriving } from "../cores/partial.ts";
import type { Asked, Part } from "../ports.ts";

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
/** What the model writes for a look he did not ask for. `found` false means the page holds nothing that will cost him later. */
export const Glance = z.object({
  found: z.boolean(),
  kind: z.enum(["date", "step"]),
  line: z.string(),
  under: z.string(),
  say: z.string(),
  sayInView: z.string(),
  ahead: z.array(z.object({ step: z.string(), by: z.string() })),
});

export const Reply = z.object({
  problem: z.string(),
  breakIndex: z.number().int().nullable(),
  breakLine: z.string().nullable(),
  result: z.string().nullable(),
  lesson: z.string().nullable(),
  board: z.array(z.array(z.string())).nullable(),
  beats: z.array(z.object({ mark: Mark, say: z.string() })),
});

/**
 * What the model is told of USC's kept pages: their text, and every date on them counted from today, so it never
 * counts days itself. It is the same for every ask on that site on one day, so the adapter sends it as a block of
 * its own, ahead of everything that changes, where the service can keep it between asks. Null when no page is known.
 */
export function pagesRead(known: KeptPage[], now: number, most: number): string | null {
  const today = new Date(now);
  if (known.length === 0) return null;
  const away = new Map<string, number>();
  for (const page of known) for (const date of datesIn(page.lines.slice(0, most).join("\n"))) away.set(worded(date), daysFrom(today, date));
  const counted = [...away].map(([date, days]) => `- ${date}: ${days === 0 ? "today" : days > 0 ? `${days} day${days === 1 ? "" : "s"} from today` : `${-days} day${days === -1 ? "" : "s"} ago`}`);
  return [
    `What you have read ahead of time. These are USC's own pages as they stood on ${known[0].readOn}: first the page on their screen, in full, including what is inside sections that are closed on their screen; then other pages of the same site. You may tell them something from these pages that is not on their screen. When you do, say where it is (the section, or the page by its name), so they can find it. A mark can only go on a line that is on their screen. About USC's dates, steps and rules, say nothing that is on neither their screen nor these pages; if it is not there, say you do not have it. That holds for what usually happens and for when something will be posted or will open: say it only where a page says it.`,
    ...known.map((page) => `Page "${page.title}" (${page.url}):\n${page.lines.slice(0, most).join("\n")}`),
    ...(counted.length > 0 ? [`The dates on these pages, counted from today by the calendar. Use these counts as they are and never work one out yourself:\n${counted.join("\n")}`] : []),
  ].join("\n\n");
}

/** The words of the request: today's date, what he said, what was read from his screen, the lesson so far, and the rung to write for. */
export function asking(asked: Asked): string {
  const { lesson, rung } = asked;
  return [
    `Today is ${new Date(asked.today).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
    `What the student just said: "${asked.words}"`,
    ...(asked.saidFirst
      ? [`You have already answered aloud with this one line, while you looked: "${asked.saidFirst}" Go on from it. Do not say it again and do not take it back; if it got something about the page wrong, put that right plainly in your first sentence.`]
      : []),
    // A line with no words is one outside the part he drew around: its words are not given to the deep model. The numbers stay the same.
    `Lines read from the screen:\n${asked.lines.flatMap((line, index) => (line ? [`${index}: ${line}`] : [])).join("\n") || "(none were read)"}`,
    ...(asked.circled.length > 0
      ? [`As they spoke, the student drew around line${asked.circled.length === 1 ? "" : "s"} ${asked.circled.join(", ")}; the path is drawn on the picture. "This", "that" and "here" mean what they drew around.`]
      : []),
    ...(asked.ahead.length > 0
      ? [`What is still ahead for them, as you found it on USC's pages earlier in this sitting. Keep to this list when they ask what is left or what comes next:\n${asked.ahead.map((step) => `- ${step.step}${step.by ? `, by ${step.by}` : ""} (from ${step.from})`).join("\n")}`]
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

// The model writes "" or -1 where it means "none". These turn a reply into the mind's own shape, where none is null.

const numbered = (index: number | null | undefined) => (index != null && index >= 0 ? index : null);

/** A mark as the mind uses it, or none when the model left its quote empty. */
const marked = (mark: z.infer<typeof Mark>) =>
  mark && mark.quote ? { ...mark, index: numbered(mark.index), label: mark.label || null, toIndex: numbered(mark.toIndex), toQuote: mark.toQuote || null } : null;

/** A board without its empty boxes and rows, or none when nothing is left. */
const boarded = (board: string[][] | null) => {
  const rows = (board ?? []).map((row) => row.filter(Boolean)).filter((row) => row.length > 0);
  return rows.length > 0 ? rows : null;
};

/** A whole reply in the mind's own shape. */
export function cleaned(reply: z.infer<typeof Reply>) {
  return {
    problem: reply.problem,
    breakIndex: numbered(reply.breakIndex),
    breakLine: reply.breakLine || null,
    result: reply.result || null,
    lesson: reply.lesson || null,
    beats: reply.beats.map(({ say, mark }) => ({ say, mark: marked(mark) })),
    board: boarded(reply.board),
  };
}

/**
 * What is known of a reply that is still arriving, in the mind's own shape. A field is there only once it is
 * finished; `nextMark` is the mark of the sentence still being written, once that mark is whole.
 */
export function arriving(part: Arriving): Part {
  const beats = Reply.shape.beats.safeParse(part.beats);
  const board = Reply.shape.board.safeParse(part.board);
  const writing = (part.next as { mark?: unknown } | undefined)?.mark;
  const next = Mark.safeParse(writing);
  return {
    ...(typeof part.problem === "string" ? { problem: part.problem } : {}),
    ...(part.breakLine !== undefined ? { breakLine: part.breakLine || null, breakIndex: numbered(part.breakIndex) } : {}),
    ...(part.result !== undefined ? { result: part.result || null } : {}),
    ...(part.lesson !== undefined ? { lesson: part.lesson || null } : {}),
    ...(part.board !== undefined && board.success ? { board: boarded(board.data) } : {}),
    ...(writing !== undefined && next.success ? { nextMark: marked(next.data) } : {}),
    beats: beats.success ? beats.data.map(({ say, mark }) => ({ say, mark: marked(mark) })) : [],
    whole: false,
  };
}
