import { cannotKnow, fullAnswer, wholeBoard } from "./judge/video.ts";
import type { Placed } from "./session.ts";
import type { Ask, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of the three bars written from the whole video (C21 to C23). Each run here is made up, with one
// fault planted in it, to prove that the check can fail.
const asked = (moments: Moment[]): Ask => ({ index: 0, moments, down: 0, up: 3000 });
const say = (n: number, at: number, text: string): Moment => ({ at, kind: "say", id: `t1:${n}`, text, opener: false, hint: false, top: false });
const voice = (n: number, at: number, ms: number): Moment => ({ at, kind: "voice", of: `t1:${n}`, ms });
const board = (at: number, rows: number): Moment => ({ at, kind: "board", text: Array.from({ length: rows }, (_, row) => `Step ${row + 1} → what it leads to`).join(" | ") });
/** The film's record of a board that grows: `rows` of it drawn at `at`. Without `rows` it is a board that came whole. */
const drew = (at: number, rows?: number): Placed => ({ at, what: "board", id: "t1", box: { x: 600, y: 600, w: 480, h: 40 + (rows ?? 6) * 50 }, rows });
const whole = (moments: Moment[], drawn: Placed[]) => wholeBoard(asked(moments), { wholeBoard: true }, drawn, Infinity);

// Six sentences, each sent as the answer arrives and voiced one after another, four seconds each.
const SIX = [0, 1, 2, 3, 4, 5].flatMap((n) => [say(n, 4000 + n * 200, `Sentence ${n + 1} of the whole story, about its own row.`), voice(n, 5000 + n * 4000, 3800)]);
const ACCOUNT = { cannotKnow: { what: "which hold is on her account", anyOf: ["can't see your account", "cannot see your account"] } };
const THREE = [say(0, 4000, "Yes, add tests for sessions that have expired."), say(1, 4200, "Add one for two requests at once."), say(2, 4400, "And try a backup and a restore.")];

export const VIDEO_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "it says it cannot see her account", check: "It says what the page cannot show it", mustPass: true, verdicts: () => cannotKnow(asked([say(0, 4000, "I can't see your account, but this page names one hold, under Academic Notice.")]), ACCOUNT) },
  { name: "it names her hold as if it could see it", check: "It says what the page cannot show it", mustPass: false, verdicts: () => cannotKnow(asked([say(0, 4000, "Your hold is the RNR01 hold, so meet your counselor to clear it.")]), ACCOUNT) },
  { name: "the whole thing, six rows, each drawn as its sentence begins", check: "The board grows a row at a time", mustPass: true, verdicts: () => whole([...SIX, board(4500, 6)], [1, 2, 3, 4, 5, 6].map((row) => drew(5000 + (row - 1) * 4000, row))) },
  { name: "the whole thing asked for, and the small board of two rows", check: "Asked for the whole thing, the board grows to four rows or more", mustPass: false, verdicts: () => whole([...SIX, board(4500, 2)], [drew(5000)]) },
  { name: "six sentences and four rows", check: "The board has a row for each sentence", mustPass: false, verdicts: () => whole([...SIX, board(4500, 4)], [1, 2, 3, 4].map((row) => drew(5000 + (row - 1) * 4000, row))) },
  { name: "six rows that came whole, as an ordinary board does", check: "The board grows a row at a time", mustPass: false, verdicts: () => whole([...SIX, board(4500, 6)], [drew(5000)]) },
  { name: "six rows a row at a time, all of them up before the second sentence begins", check: "The board grows a row at a time", mustPass: false, verdicts: () => whole([...SIX, board(4500, 6)], [1, 2, 3, 4, 5, 6].map((row) => drew(5000 + (row - 1) * 300, row))) },
  { name: "six rows, two of them drawn in the same moment", check: "The board grows a row at a time", mustPass: false, verdicts: () => whole([...SIX, board(4500, 6)], [1, 3, 4, 5, 6].map((row) => drew(5000 + (row - 1) * 4000, row))) },
  { name: "six rows, the last drawn after its sentence has ended", check: "The board grows a row at a time", mustPass: false, verdicts: () => whole([...SIX, board(4500, 6)], [1, 2, 3, 4, 5, 6].map((row) => drew(row === 6 ? 40000 : 5000 + (row - 1) * 4000, row))) },
  { name: "a broad follow-up answered in six sentences", check: "A broad follow-up gets six sentences or more", mustPass: true, verdicts: () => fullAnswer(asked(SIX), { fullAnswer: true }) },
  { name: "a broad follow-up answered in three sentences", check: "A broad follow-up gets six sentences or more", mustPass: false, verdicts: () => fullAnswer(asked(THREE), { fullAnswer: true }) },
  { name: "an ordinary first question answered in six sentences", check: "An ordinary answer stays at 4 sentences or fewer", mustPass: false, verdicts: () => fullAnswer(asked(SIX), { sentencesMost: 4 }) },
  { name: "an ordinary first question answered in three", check: "An ordinary answer stays at 4 sentences or fewer", mustPass: true, verdicts: () => fullAnswer(asked(THREE), { sentencesMost: 4 }) },
];
