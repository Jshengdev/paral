import { readFileSync } from "node:fs";
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
// The scenario's own lists, as the judge reads them in a run: a way of saying it that a run used and the list missed
// is planted here with the list it was added to (2026-11-16: "This page can't show your own hold", "I have no page
// that shows your own GPA", both failed as first judged).
const KNOWS = JSON.parse(readFileSync(new URL("../scenarios/25-what-it-cannot-know.json", import.meta.url), "utf8")).steps.map((step: { expect: { cannotKnow: { what: string; anyOf: string[] } } }) => ({ cannotKnow: step.expect.cannotKnow }));
const THREE = [say(0, 4000, "Yes, add tests for sessions that have expired."), say(1, 4200, "Add one for two requests at once."), say(2, 4400, "Try a backup and a restore too.")];
// Three sentences, two of them cut in two for the voice at ", so": five lines said, three sentences written.
const CUT = [say(0, 4000, "A 307 is a temporary redirect."), say(1, 4200, "So browsers do not keep it."), say(2, 4400, "Each visit reaches your server."), say(3, 4600, "So every click is counted."), say(4, 4800, "That is why both show up."), say(5, 5000, "So nothing is lost.")];
// Five sentences and the line on the answer's card, which is shown and never said.
const FIVE_AND_A_CARD: Moment[] = [...SIX.slice(0, 10), { at: 30000, kind: "say", id: "t1o:0", text: "That is on the Recognition Process page. Want me to take you there?", opener: false, hint: false, top: false }, { at: 30000, kind: "look", name: "voice down", of: "t1o" }];

export const VIDEO_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "it says it cannot see her account", check: "It says what the page cannot show it", mustPass: true, verdicts: () => cannotKnow(asked([say(0, 4000, "I can't see your account, but this page names one hold, under Academic Notice.")]), ACCOUNT) },
  { name: "it names her hold as if it could see it", check: "It says what the page cannot show it", mustPass: false, verdicts: () => cannotKnow(asked([say(0, 4000, "Your hold is the RNR01 hold, so meet your counselor to clear it.")]), ACCOUNT) },
  { name: "the scenario's list: it says the page cannot show her hold", check: "It says what the page cannot show it", mustPass: true, verdicts: () => cannotKnow(asked([say(0, 4000, "This page can't show your own hold, so I can't tell which one you have.")]), KNOWS[0]) },
  { name: "the scenario's list: it names her hold as if it could see it", check: "It says what the page cannot show it", mustPass: false, verdicts: () => cannotKnow(asked([say(0, 4000, "Your hold is the RNR01 hold, which goes on when your GPA drops below 2.0.")]), KNOWS[0]) },
  { name: "the scenario's list: it says no page shows her grade point average", check: "It says what the page cannot show it", mustPass: true, verdicts: () => cannotKnow(asked([say(0, 4000, "I have no page that shows your own GPA; this counseling page only gives the rules, not your grades.")]), KNOWS[1]) },
  { name: "the scenario's list: it gives her a grade point average", check: "It says what the page cannot show it", mustPass: false, verdicts: () => cannotKnow(asked([say(0, 4000, "Your GPA is 3.2 right now, which is above the 2.0 line.")]), KNOWS[1]) },
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
  { name: "an ordinary answer of three sentences, said as six lines because each was cut at so", check: "An ordinary answer stays at 4 sentences or fewer", mustPass: true, verdicts: () => fullAnswer(asked(CUT), { sentencesMost: 4 }) },
  { name: "a broad follow-up answered in three sentences that are said as six lines", check: "A broad follow-up gets six sentences or more", mustPass: false, verdicts: () => fullAnswer(asked(CUT), { fullAnswer: true }) },
  { name: "a broad follow-up answered in five sentences, with a sixth line that is only on its card", check: "A broad follow-up gets six sentences or more", mustPass: false, verdicts: () => fullAnswer(asked(FIVE_AND_A_CARD), { fullAnswer: true }) },
];
