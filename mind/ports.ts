import { z } from "zod";
import { MarkKind } from "../seam/schema.ts";
import type { Lesson } from "./cores/hold.ts";
import type { Rung } from "./settings.ts";

export type Asked = {
  words: string;
  picturePath: string | null;
  lines: string[];
  /** The numbers of the lines he drew around as he asked; empty when he drew nothing. */
  circled: number[];
  /** The fixed line he hears with the ring, just before the hint, when his work has a wrong line. */
  leadIn: string | null;
  /** The lessons that can be shown as a clip, each with the idea it shows; empty when none can. */
  lessons: { name: string; idea: string }[];
  lesson: Lesson;
  rung: Rung;
  fresh: boolean;
};

export const Beat = z.object({
  say: z.string().min(1),
  mark: z
    .object({
      kind: MarkKind,
      index: z.number().int().nonnegative().nullable(),
      quote: z.string().min(1),
      label: z.string().min(1).nullable(),
      toIndex: z.number().int().nonnegative().nullable().optional(),
      toQuote: z.string().min(1).nullable().optional(),
    })
    .nullable(),
});
export type Beat = z.infer<typeof Beat>;

export const Answered = z.object({
  problem: z.string().min(1),
  breakLine: z.string().min(1).nullable(),
  breakIndex: z.number().int().nonnegative().nullable().optional(),
  result: z.string().min(1).nullable(),
  /** The name of a lesson to show as a clip, when one fits what he asked. */
  lesson: z.string().min(1).nullable().optional(),
  beats: z.array(Beat).min(1),
  board: z.array(z.array(z.string().min(1)).min(1)).min(1).nullable().optional(),
});
export type Answered = z.infer<typeof Answered>;

/** What is known of an answer that is still arriving. Fields are present once they are finished. */
export type Part = {
  problem?: string;
  breakLine?: string | null;
  breakIndex?: number | null;
  result?: string | null;
  lesson?: string | null;
  /** The board, once it is whole. It comes before the sentences, so it can open before any of them is said. */
  board?: string[][] | null;
  beats: Beat[];
  /** The mark of the sentence still being written, once that mark is whole. */
  nextMark?: Beat["mark"];
  whole: boolean;
};

export interface Brain {
  answer(asked: Asked, signal: AbortSignal, onPart?: (part: Part) => void): Promise<Answered>;
}

export interface SecondLook {
  leaks(line: string, problem: string, signal: AbortSignal): Promise<boolean>;
}

/**
 * The fast model's two lines: what it is about to do, and one thing anyone can read straight off the page (or none).
 * The first is given the moment it is written; the second follows.
 */
export type Opened = { line: string; seen: Promise<string | null> };

export interface Opener {
  open(words: string, lines: string[], signal: AbortSignal): Promise<Opened>;
}


export type Listening = { sound(pcm: Buffer): void; finish(): Promise<string> };

export interface Ear {
  listen(onWords: (text: string) => void, signal: AbortSignal): Listening;
}

export type Spoken = { words: string[]; start: number[]; end: number[] };

export interface Voice {
  say(text: string, signal: AbortSignal, onSound: (pcm: Buffer) => void, onWords: (spoken: Spoken) => void): Promise<void>;
  /** Gets ready to speak, so the first sentence does not wait for a connection. Safe to call often. */
  warm?(): void;
}

export type Clip = { clip: string; still: string; seconds: number };

export interface Lessons {
  render(name: string, example: Record<string, string | string[]>, signal: AbortSignal): Promise<Clip>;
}

export type Ports = { brain: Brain; secondLook: SecondLook; ear: Ear; voice: Voice | null; opener: Opener | null; lessons: Lessons | null };
