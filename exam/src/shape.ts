import { z } from "zod";

export const Box = z.object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });
export type Box = z.infer<typeof Box>;

export const Display = z.object({ id: z.number().int(), scale: z.number().positive(), x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() });
export type Display = z.infer<typeof Display>;

export const Truth = z.object({ id: z.string().min(1), text: z.string(), box: Box });
export type Truth = z.infer<typeof Truth>;

// A scenario names a thing on the page by its data-id. On a real page there are no such ids, so the name may also
// be words that stand on the page: the first piece of text that holds them.
export const findNamed = (truth: Truth[], name: string): Truth | undefined =>
  truth.find((t) => t.id === name) ?? truth.find((t) => t.text.toLowerCase().includes(name.toLowerCase()));

const Expect = z.object({
  opener: z.boolean().optional(),
  line: z.string().optional(),
  mark: z.object({ on: z.string().min(1), kinds: z.array(z.string()).optional() }).nullable().optional(),
  board: z.boolean().optional(),
  clip: z.boolean().optional(),
  sentences: z.number().int().positive().optional(),
  never: z.array(z.string().min(1)).optional(),
  stopsVoiceWithinMs: z.number().positive().optional(),
  textOnly: z.boolean().optional(),
  plain: z.boolean().optional(),
  /** Words the answer must hold as the page writes them, such as a due date. */
  says: z.array(z.string().min(1)).optional(),
  /** Words the answer may not hold, such as "you can still apply" on a page whose date has passed. */
  neverSays: z.array(z.string().min(1)).optional(),
  /** A date the answer must count the days to, from the day of the run: "November 22". */
  countsDaysTo: z.string().min(1).optional(),
  /** Something the answer must say in words of its own choosing: `what` it is, and the words any one of which shows it. */
  saysThat: z.object({ what: z.string().min(1), anyOf: z.array(z.string().min(1)).min(1) }).optional(),
  /** He pressed again at once: nothing of the ask before this one may be said or drawn after this press. */
  takesBackTheAskBefore: z.boolean().optional(),
  /** The thing is on this page and not in view: which way he must scroll to it, and, when given, words the name it leads to must hold. */
  way: z.object({ to: z.enum(["up", "down"]), toward: z.string().min(1).optional() }).optional(),
  /** He said "show me": which step of what is ahead this ask must be on, from 1. */
  step: z.number().int().positive().optional(),
  /** He asks it to keep a date: the date, as a page writes it, that the calendar file it opens must hold. */
  keeps: z.string().min(1).optional(),
  /** On a look with no key: whether anything may be shown at all. False on a page it has not read, or one it has already spoken to. */
  shows: z.boolean().optional(),
  /** This look's line is also said aloud: a page's first look in a sitting that shows a date (his word of 2026-11-15, 00:02). Every other look is shown and not spoken. */
  spoken: z.boolean().optional(),
  /**
   * The dates still ahead on this page, soonest first, each as a page writes it. On a look they mean no board may be
   * drawn (what is ahead waits for his ask); on a "show me" step the walk's board must hold them in this order.
   */
  ahead: z.array(z.string().min(1)).optional(),
  /** Something the page cannot show it, which it must say it cannot know: `what` it is, and words any one of which says so. */
  cannotKnow: z.object({ what: z.string().min(1), anyOf: z.array(z.string().min(1)).min(1) }).optional(),
  /** He asks for the whole thing drawn: the board must grow to four rows or more, a row for each sentence, a row at a time. */
  wholeBoard: z.boolean().optional(),
  /** A broad follow-up (what else, what next): the answer must run to six sentences or more. */
  fullAnswer: z.boolean().optional(),
  /**
   * He asks for a drawing of the steps it has just explained: the board must be one column, with a box for each of
   * these steps in this order (a word or two of each as the page writes it; `a|b` when either names it). False on
   * a drawing of how things connect, which must keep its rows of boxes joined across.
   */
  column: z.union([z.array(z.string().min(1)).min(2), z.literal(false)]).optional(),
  /**
   * He asks to be shown what a thing would look like: the board must be words alone, each line a whole example
   * that fits this pattern (a regular expression, letters of either case), written large, a line at a time.
   */
  written: z.string().min(1).optional(),
  /** After this ask's board is up he drags it by its strip, `by` points across and down, and presses once beside the strip: it must go that far and no further, and stay. */
  drag: z.object({ by: z.tuple([z.number(), z.number()]) }).optional(),
  /** The answer adds something about one part of its drawing: it must write a short note on the board, with its pointer, as it says it. */
  notes: z.boolean().optional(),
  /** An answer that must stay short: the most sentences it may have. */
  sentencesMost: z.number().int().positive().optional(),
});
export type Expect = z.infer<typeof Expect>;

// A table's row is one thing to him, but the page gives each of its cells as a line of its own. A mark on any cell of
// a row is on the row: once a bracket took the two rows by their names and left the date cells alone.
export const rowOf = (want: Truth, truth: Truth[]): Truth[] =>
  truth.filter((t) => t.box.h < 90 && Math.abs(t.box.y + t.box.h / 2 - (want.box.y + want.box.h / 2)) <= want.box.h / 2);

// He drags the board of the ask before this step: `by` points across and down, starting `afterBoardMs` after the
// board's first frame and taking `overMs`. `from` "beside" starts the press on the card just under the strip, and
// must move nothing. The stand-in works out the points from where the strip is; the app's flow takes this as it is.
const Drag = z.object({ by: z.tuple([z.number(), z.number()]), afterBoardMs: z.number().positive(), overMs: z.number().positive(), from: z.enum(["strip", "beside"]).optional() });

const Step = z.union([
  // A step may cut in on the ask before it: `cutInAfterMs` after its first line of any kind,
  // `cutInAnswerAfterMs` after the first sentence of the answer itself, or `pressAgainAfterMs` after its release.
  z.object({ say: z.string(), circle: z.string().nullable(), page: z.string().min(1).optional(), cutInAfterMs: z.number().positive().optional(), cutInAnswerAfterMs: z.number().positive().optional(), pressAgainAfterMs: z.number().positive().optional(), expect: Expect }),
  z.object({ close: z.literal(true), expect: Expect.optional() }),
  z.object({ drag: Drag }),
  // A look with no key pressed: what the app sends by itself when the display has changed and stood still.
  // `page` puts another page on the screen from this step on (he scrolled, or opened a section).
  z.object({ look: z.literal(true), page: z.string().min(1).optional(), waitMs: z.number().positive().optional(), expect: Expect }),
]);
export type Step = z.infer<typeof Step>;

/** A real public page: its address, the place on it to bring to the top, and what it keeps hidden until he clicks. */
const Source = z.object({ url: z.string().url(), at: z.string().optional(), hide: z.string().optional() });

export const Scenario = z.object({
  v: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  criteria: z.array(z.string().regex(/^[CU]\d+$/)).min(1),
  video: z.string().optional(),
  page: z.string().min(1),
  source: Source.optional(),   // a real public page, fetched into tmp/real/ and never committed
  /** Other real pages a step puts on the screen, by the name a step uses after "real:". */
  others: z.record(z.string().regex(/^[a-z0-9-]+$/), Source).optional(),
  fault: z.enum(["voice"]).optional(),
  steps: z.array(Step).min(1),
});
export type Scenario = z.infer<typeof Scenario>;

const StartAfter = z.union([z.literal("idle"), z.object({ firstSayPlusMs: z.number().positive() }), z.object({ firstAnswerPlusMs: z.number().positive() }), z.object({ releasePlusMs: z.number().positive() })]);

export const Flow = z.object({
  v: z.literal(1),
  display: Display,
  page: z.string().min(1),
  source: z.object({ url: z.string().url(), at: z.string().optional() }).optional(),   // a real public page, fetched into tmp/real/ and never committed
  fault: z.enum(["voice"]).optional(),
  asks: z.array(z.union([
    z.object({ wav: z.string().min(1), trail: z.array(z.tuple([z.number(), z.number(), z.number()])), startAfter: StartAfter, page: z.string().min(1).optional() }),
    z.object({ close: z.literal(true) }),
    z.object({ drag: Drag }),
    z.object({ look: z.literal(true), waitMs: z.number().positive(), page: z.string().min(1).optional() }),
  ])),
});
export type Flow = z.infer<typeof Flow>;
