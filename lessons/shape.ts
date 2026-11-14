import { z } from "zod";

const colour = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const Look = z.object({ ink: colour, accent: colour, ground: colour });

// One entry per lesson: the data its composition needs. A lesson is always a parallel example, on other numbers
// than the student's own, so it can never hold their result.
export const LESSONS = {
  // An equation as a balance: the same thing is added to both pans, and it stays level.
  balance: z.object({
    left: z.string().min(1).max(12),
    right: z.string().min(1).max(12),
    add: z.string().min(1).max(8),
    leftAfter: z.string().min(1).max(12),
    rightAfter: z.string().min(1).max(12),
    say: z.tuple([z.string().max(34), z.string().max(34), z.string().max(34)]),
  }).extend(Look.shape),
};

export type LessonName = keyof typeof LESSONS;
export const isLesson = (name: string): name is LessonName => name in LESSONS;
