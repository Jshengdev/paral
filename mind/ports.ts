import { z } from "zod";
import { MarkKind } from "../seam/schema.ts";
import type { Lesson } from "./cores/hold.ts";
import type { KeptPage } from "./cores/page.ts";
import type { Anchors } from "./cores/sheet.ts";
import type { Rung } from "./settings.ts";

export type Asked = {
  words: string;
  picturePath: string | null;
  lines: string[];
  /** The numbers of the lines he drew around as he asked; empty when he drew nothing. */
  circled: number[];
  /** The fixed line he hears with the ring, just before the hint, when his work has a wrong line. */
  leadIn: string;
  /** The quick line he has just heard, word for word; null when nothing was said before the answer. */
  saidFirst: string | null;
  /** The moment of the ask, so the model knows today's date and dates can be counted from it. */
  today: number;
  /** USC's kept pages that bear on this ask: the one on his screen first, then others of the same site. Empty when his screen is none of them. */
  known: KeptPage[];
  /** What is still ahead for him, as found on kept pages earlier in this sitting: each step, its date as the page writes it, and the page. */
  ahead: { step: string; by: string; from: string }[];
  /** The named places of a measured drawing on his screen that an answer may have ringed; empty when his screen holds none. */
  spots: { name: string; what: string }[];
  /** The lessons that can be shown as a clip, each with the idea it shows; empty when none can. */
  lessons: { name: string; idea: string }[];
  lesson: Lesson;
  rung: Rung;
  fresh: boolean;
  /** Present only when the switch is on and he asked to have the exercise worked through: the steps given so far, in order. */
  walk?: { steps: string[] };
  /** Present only when his words ask for the whole thing drawn, start to finish: the answer may be longer and its board has a row a sentence. */
  whole?: true;
  /** Present only when, as a follow-up, his words ask for a drawing of what was just said: a list of steps may be drawn as one column. */
  column?: true;
  /** Present only when his words ask to be shown what a thing would look like: the board may be whole examples written out, a line a sentence. */
  written?: true;
  /** Present only on a broad follow-up (an answer came before, and his words ask for more than one thing): the answer may be longer. */
  full?: true;
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
  /** The names of at most two places of the drawing that the answer speaks of, to be ringed. */
  spots: z.array(z.string()).optional(),
  /** Only on a step of the working he asked for: the step in a few words, for the board, and whether it says what the working gives. */
  walk: z.object({ step: z.string().min(1), last: z.boolean() }).optional(),
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
  /**
   * Has the service keep, ahead of any ask, what an ask on this kept page begins with (the pages it is given), so his
   * first question there does not wait for that to be kept. Nothing of his screen or his words is sent. A stand-in has none.
   */
  warm?(known: KeptPage[], today: number): void;
}

export interface SecondLook {
  leaks(line: string, problem: string, signal: AbortSignal): Promise<boolean>;
}

/**
 * The fast model's one quick line: what it is about to do, which may name the thing on his page that matters.
 * `stillSpeaking` is true for a draft made while he holds the key: his words may not be the whole question yet.
 */
export interface Opener {
  open(words: string, lines: string[], stillSpeaking: boolean, signal: AbortSignal): Promise<string>;
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

/**
 * What a look he did not ask for found on a kept page: the line that holds the one thing that will cost him later,
 * the heading it sits under ("" for none), a sentence for when the line is not in view and one for when it is, and
 * what is still ahead for it, each step with its date as a page writes it ("" when none is given) and, when the page
 * has one, the line where the step is written (`at`). Its kind is a
 * date still ahead, a step with no date, or a deadline that has passed on a page that still reads as open.
 */
export type Glanced = { kind: "date" | "step" | "passed"; line: string; under: string; say: string; sayInView: string; ahead: { step: string; by: string; at?: string }[] };

/** What he asked a moment ago and what he was told, for a look at the page he then went to. */
export type Following = { words: string; told: string[] };

export interface Glancer {
  /**
   * Null when the page holds nothing to show. With no `following` it looks for the one thing that will cost him
   * later; with it, for what he was just sent to this page for. Only the kept page's own text is sent, with today's
   * date and, when he is being followed, his question and the answer he was given.
   */
  glance(page: KeptPage, today: number, signal: AbortSignal, following?: Following): Promise<Glanced | null>;
}

/** What a cut was asked: the picture a look saved, the size its lines were read at, the part to cut in those pixels, and the file to write. */
export type CutJob = { from: string; read: { w: number; h: number }; part: { x: number; y: number; w: number; h: number }; to: string };
/** Cuts a part out of a saved picture into a file of its own, on the Mac. False when it could not: the picture is then left out. */
export interface Cutter {
  cut(job: CutJob): Promise<boolean>;
}
/**
 * `pages` is not a service: it is USC's pages as read ahead of time and kept in `pages/kept/`; empty when none are kept.
 * Nor is `sheets`: pages measured once, with a box for each place of a drawing (`sheets/`).
 */
export type Ports = { brain: Brain; secondLook: SecondLook; ear: Ear; voice: Voice | null; opener: Opener | null; lessons: Lessons | null; glancer: Glancer | null; cutter: Cutter | null; pages: KeptPage[]; sheets: Anchors[] };
