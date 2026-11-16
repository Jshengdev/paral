import { board, readable } from "./judge/board.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kept } from "./judge/keep.ts";
import { walked } from "./judge/showme.ts";
import { glanced, pageChanged, wayDrawn } from "./judge/look.ts";
import { marks, standingBefore } from "./judge/marks.ts";
import { onlyThePart } from "./judge/picture.ts";
import { COLUMN_CASES } from "./planted-column.ts";
import { LABEL_CASES } from "./planted-label.ts";
import { PEN_CASES } from "./planted-pen.ts";
import { VIDEO_CASES } from "./planted-video.ts";
import { cutIn, pressedAgain } from "./judge/ending.ts";
import { timing } from "./judge/timing.ts";
import { heardWhole, voiced } from "./judge/voice.ts";
import { readSoFar } from "./judge/pages.ts";
import { spoken } from "./judge/words.ts";
import type { Placed } from "./session.ts";
import type { Box } from "./shape.ts";
import type { Ask, Look, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// A check that cannot fail proves nothing. Each case here is a made-up ask with one fault planted in it, or with
// none, and names the check that must fail or pass on it. `node exam/run.ts planted` runs them all, with no service.
// The ask that cut in on the one before it: its key went down at 20 s on the run's clock.
const cutting = (extra: Moment[]): Ask => ({ index: 1, down: 20000, up: 22000, moments: [{ at: 20000, kind: "key-down" }, { at: 20010, kind: "look", name: "listening" }, { at: 22000, kind: "key-up" }, ...extra] });

// An ask he took back before it said anything.
const SILENT: Ask = { index: 0, down: 17000, up: 19900, moments: [{ at: 17000, kind: "key-down" }, { at: 19900, kind: "key-up" }] };

// Two rows of a table, as the page gives them: a name and a date in each.
const TABLE = [
  { id: "a1", text: "Study Days", box: { x: 88, y: 770, w: 76, h: 16 } }, { id: "a3", text: "December 5-8", box: { x: 545, y: 770, w: 89, h: 16 } },
  { id: "b1", text: "Exams", box: { x: 88, y: 822, w: 45, h: 16 } }, { id: "b3", text: "December 9-16", box: { x: 545, y: 822, w: 96, h: 16 } },
];
const marked = (kind: string, at: Box): Moment => ({ at: 7000, kind: "mark", id: "t1:0", mark: kind, box: at });

type Case = { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] | Promise<Verdict[]> };

const UP = 3000;
const DISPLAY = { id: 1, scale: 2, x: 0, y: 0, w: 1728, h: 1117 };
const box = { x: 100, y: 80, w: 200, h: 20 };
const PAGE = [{ id: "work", text: "My work", box }, { id: "limiter", text: "The rate limiter keeps its buckets in memory", box }];
// A page whose one fact is a time of day.
const NOON = [{ id: "head", text: "Spring 2027 applications NOW Open", box }, { id: "due", text: "due NOON April 24, 2026", box }];
// A page whose subject is an address, which is one long word: "trycloudflare".
const LINKS = [{ id: "head", text: "Short link", box }, { id: "link-1", text: "https://quiet-harbor-demo.trycloudflare.com/4CQMZu", box }];
// A page that writes each date with a colon after it, one of them with a time.
const COLONS = [{ id: "closes", text: "November 22 at 11:59pm: Application closes.", box }, { id: "advisors", text: "December 1: Deadline for advisors to submit their requirements.", box }];
// The day of a run: Saturday, November 14, 2026, at 7 pm in Los Angeles.
const RAN = new Date("2026-11-14T19:00:00-08:00");
// A page the build read ahead of time, as its record names it.
const KEPT = { title: "Recognition Process", url: "https://example.edu/recognition", lines: ["Deadlines +", "October 27: Application opens", "November 22 at 11:59pm: Application closes.", "December 1: Deadline for advisors to submit their requirements."] };
// A calendar file as the build writes one, for the club's closing date.
const ICS = join(mkdtempSync(join(tmpdir(), "paral-exam-keep-")), "keep.ics");
writeFileSync(ICS, "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261122T235900\nSUMMARY:Application closes\nEND:VEVENT\nEND:VCALENDAR\n");
// The exam's display, and a way line sent at two seconds.
const SCREEN = { id: 1, scale: 2, x: 0, y: 0, w: 1728, h: 1117 };
const WAY_DOWN: Moment = { at: 2000, kind: "way", to: "down", toward: "Deadlines" };
// How the build draws a board, as its look file had it on 2026-11-14.
const BOARD_LOOK = { pad: 20, boxPadY: 9, rowGap: 16, type: 15 };
// A look with no key at 1000 ms, and the one line it shows a second later with a trail above it.
const looked = (moments: Moment[]): Look => ({ index: 0, at: 1000, moments: [{ at: 1000, kind: "glance", lines: 12 }, ...moments] });
const shownLine = (trail: string[]): Extract<Moment, { kind: "say" }> => ({ at: 2000, kind: "say", id: "g1:0", text: "The application closes November 22 at 11:59pm; see Deadlines, further down.", opener: false, hint: false, top: false, trail });
// A page of another site, with no date of the club's on it.
const OTHER = { title: "Catalina Maymester", url: "https://example.edu/maymester", lines: ["Application deadline: November 2, 2026"] };
// Some signs that an answer says a date has passed. A scenario lists its own.
const PASSED = { what: "the date has passed", anyOf: ["passed", "closed", "missed", "ago", "no longer"] };
// A page with a due date and a range of dates, as two lines.
const DATED = [{ id: "due", text: "Application deadline: March 1, 2027", box }, { id: "exams", text: "Exams December 9-16", box }];
const say = (id: string, at: number, text: string, extra: Partial<{ opener: boolean; hint: boolean; top: boolean }> = {}): Moment => ({ at, kind: "say", id, text, opener: extra.opener ?? false, hint: extra.hint ?? false, top: extra.top ?? false });
const voice = (of: string, at: number, ms: number): Moment => ({ at, kind: "voice", of, ms });
const mark = (id: string, at: number): Moment => ({ at, kind: "mark", id, mark: "underline", box });
const drawn = (at: number): Placed[] => [{ at, what: "mark", id: "t1/0", box }];
const sentence = [say("t1:0", 6000, "First sentence about the plan."), voice("t1:0", 6100, 3000)];

function ask(extra: Moment[], opts: { listening?: boolean; heardAt?: number; trail?: boolean; soundAt?: number } = {}): Ask {
  const moments: Moment[] = [{ at: 0, kind: "key-down" }, { at: opts.heardAt ?? 1400, kind: "heard", text: "why" }, { at: UP, kind: "key-up" },
    say("t1:-1", 3700, "Okay, let me look.", { opener: true }), voice("t1:-1", opts.soundAt ?? 3800, 1500), ...extra];
  if (opts.listening !== false) moments.push({ at: 10, kind: "look", name: "listening" });
  if (opts.trail) moments.push({ at: 500, kind: "trail", x: 1, y: 1 });
  return { index: 0, moments: moments.sort((a, b) => a.at - b.at), down: 0, up: UP };
}

const CASES: Case[] = [
  { name: "a mark 300 ms after its sentence begins", check: "Each mark lands", mustPass: true, verdicts: () => timing(ask([...sentence, mark("t1:0", 6000)]), {}, drawn(6400)) },
  { name: "a mark 2 s after its sentence begins", check: "Each mark lands", mustPass: false, verdicts: () => timing(ask([...sentence, mark("t1:0", 6000)]), {}, drawn(8100)) },
  { name: "a mark 3 s before its sentence", check: "Each mark lands", mustPass: true, verdicts: () => timing(ask([...sentence, mark("t1:0", 3100)]), {}, drawn(3100)) },
  { name: "3.2 s of nothing after the opener", check: "No long stretch", mustPass: false, verdicts: () => timing(ask([say("t1:0", 8500, "x"), voice("t1:0", 8500, 2000)]), {}, []) },
  { name: "the same gap, with a mark drawn in it", check: "No long stretch", mustPass: true, verdicts: () => timing(ask([say("t1:0", 8500, "x"), voice("t1:0", 8500, 2000)]), {}, drawn(6800)) },
  { name: "a sentence that takes 9 s to say", check: "No sentence takes long", mustPass: false, verdicts: () => timing(ask([say("t1:0", 5400, "long"), voice("t1:0", 5400, 9000)]), {}, []) },
  { name: "a sentence that takes 7 s to say", check: "No sentence takes long", mustPass: true, verdicts: () => timing(ask([say("t1:0", 5400, "fine"), voice("t1:0", 5400, 7000)]), {}, []) },
  { name: "no listening look at the press", check: "It shows it is listening", mustPass: false, verdicts: () => timing(ask(sentence, { listening: false }), {}, []) },
  { name: "his first words 2.6 s after the press", check: "His first words show", mustPass: false, verdicts: () => timing(ask(sentence, { heardAt: 2600 }), {}, []) },
  { name: "he circled, and the first ink came 4 s after release", check: "After he circles", mustPass: false, verdicts: () => timing(ask([...sentence, mark("t1:0", 7000)], { trail: true }), {}, drawn(7000)) },
  { name: "he hears the first words 1.4 s after release", check: "He hears the first words", mustPass: false, verdicts: () => timing(ask([], { soundAt: UP + 1400 }), {}, []) },
  { name: "the board opens during the first sentence", check: "The board opens while", mustPass: true, verdicts: () => board(ask([...sentence, { at: 7000, kind: "board", text: "a → b" }]), { board: true }, [], []) },
  { name: "the board opens after the first sentence ends", check: "The board opens while", mustPass: false, verdicts: () => board(ask([...sentence, { at: 9500, kind: "board", text: "a → b" }]), { board: true }, [], []) },
  { name: "a card that opens empty and fills later", check: "The board never opens empty", mustPass: false, verdicts: () => board(ask([...sentence, { at: 3500, kind: "board", text: "" }, { at: 7000, kind: "board", text: "a → b" }]), { board: true }, [], []) },
  { name: "a board that opens on its first row", check: "The board never opens empty", mustPass: true, verdicts: () => board(ask([...sentence, { at: 7000, kind: "board", text: "a → b" }]), { board: true }, [], []) },
  { name: "a board of one box", check: "The board is a drawing", mustPass: false, verdicts: () => board(ask([...sentence, { at: 4000, kind: "board", text: "Sign up" }]), { board: true }, [], []) },
  { name: "a box that begins with an arrow", check: "No box carries an arrow", mustPass: false, verdicts: () => board(ask([...sentence, { at: 4000, kind: "board", text: "a → → b" }]), { board: true }, [], []) },
  { name: "a line that says NONE", check: "No line talks about its own workings", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "This is a student's own summary, so I'll say NONE.")]), {}, []) },
  { name: "an opener that speaks of him as the student", check: "No line talks about its own workings", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Let's sort out what the student is asking about the domain.")]), {}, []) },
  { name: "a line about the student calendar on the page", check: "No line talks about its own workings", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "That policy covers faculty and staff, not the student calendar below.")]), {}, []) },
  { name: "the rung's fixed line said twice in one answer", check: "A sentence is said once", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Read the highlighted line again, slowly.", { hint: true }), say("t1:1", 9000, "Read the highlighted line again, slowly.", { hint: true })]), {}, []) },
  { name: "an answer's card that shows its first sentence again, marked shown only", check: "A sentence is said once", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "The deadline was November 2, 2026."), voice("t1:0", 6100, 2000), say("t1o:0", 9000, "The deadline was November 2, 2026."), { at: 9000, kind: "look", name: "voice down", detail: "an answer's card is shown, not spoken", of: "t1o" }]), {}, []) },
  { name: "an answer's card marked shown only, yet its sentence is spoken again", check: "A sentence is said once", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The deadline was November 2, 2026."), voice("t1:0", 6100, 2000), say("t1o:0", 9000, "The deadline was November 2, 2026."), { at: 9000, kind: "look", name: "voice down", detail: "an answer's card is shown, not spoken", of: "t1o" }, voice("t1o:0", 9100, 2000)]), {}, []) },
  { name: "an answer that names nothing on the page", check: "The answer is about the page", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Bananas are yellow and grow in bunches.")]), { sentences: 1 }, PAGE) },
  { name: "only a waiting line shares a word with the page", check: "The answer is about the page", mustPass: false, verdicts: () => spoken(ask([say("t1:-2", 5000, "Give me a moment to work it out.", { opener: true }), say("t1:0", 6000, "Bananas are yellow and grow in bunches.")]), { sentences: 1 }, PAGE) },
  { name: "an answer that names the page's limiter", check: "The answer is about the page", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "The rate limiter is the one to worry about.")]), { sentences: 1 }, PAGE) },
  { name: "an answer that names part of an address on the page", check: "The answer is about the page", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Almost all the length is the temporary Cloudflare tunnel name."), say("t1:1", 9000, "Buying a short domain of your own fixes it.")]), { sentences: 1 }, LINKS) },
  { name: "a short follow-up that says the one thing asked for, as the page writes it", check: "The answer is about the page", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It was at noon, twelve o'clock midday."), say("t1:1", 9000, "No time zone is named, so take it as Pacific.")]), { sentences: 1, says: ["noon"] }, NOON) },
  { name: "the same follow-up when the scenario names nothing it must say", check: "The answer is about the page", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "It was at noon, twelve o'clock midday."), say("t1:1", 9000, "No time zone is named, so take it as Pacific.")]), { sentences: 1 }, NOON) },
  { name: "a sentence cut at a comma into a piece", check: "No piece is cut off", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "You add 4 to both sides, so y equals 9 plus 4."), say("t1:1", 9000, "Which is 13.")]), {}, []) },
  { name: "a whole sentence that begins with Like", check: "No piece is cut off", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Like terms go together on one side.")]), {}, []) },
  { name: "the old answer goes on after he cuts in", check: "Nothing more of the old answer", mustPass: false, verdicts: () => cutIn(cutting([say("t1:1", 21000, "And the second step is this one.")]), ask([...sentence]), { stopsVoiceWithinMs: 300 }, null) },
  { name: "only the new answer after he cuts in", check: "Nothing more of the old answer", mustPass: true, verdicts: () => cutIn(cutting([say("t2:0", 24000, "A forged cookie is a faked one.")]), ask([...sentence]), { stopsVoiceWithinMs: 300 }, null) },
  { name: "he cut in while the sentence before it was still being spoken", check: "Every sentence shown is also spoken", mustPass: true, verdicts: () => voiced(ask([say("t1:0", 7208, "Start with check three."), voice("t1:0", 7315, 5200), say("t1:1", 7954, "Then four, five and six in order.")]), {}, 8277) },
  { name: "an offer's line of its own, shown on its card and marked shown only", check: "Every sentence shown is also spoken", mustPass: true, verdicts: () => voiced(ask([say("t1:0", 7208, "Start with check three."), voice("t1:0", 7315, 1000), say("t1o:0", 9000, "Want me to take you there?"), { at: 9000, kind: "look", name: "voice down", detail: "an offer is shown on its card, not spoken", of: "t1o" }]), {}, null) },
  { name: "an answer's own second sentence marked shown only", check: "Every sentence shown is also spoken", mustPass: false, verdicts: () => voiced(ask([say("t1:0", 7208, "Start with check three."), voice("t1:0", 7315, 1000), say("t1:1", 9000, "Then four, five and six in order."), { at: 9000, kind: "look", name: "voice down", detail: "shown only", of: "t1" }]), {}, null) },
  { name: "a shown sentence that is never spoken, with no cut", check: "Every sentence shown is also spoken", mustPass: false, verdicts: () => voiced(ask([say("t1:0", 7208, "Start with check three."), voice("t1:0", 7315, 5200), say("t1:1", 7954, "Then four, five and six in order.")]), {}, null) },
  { name: "he cut in long after its turn came and it was still silent", check: "Every sentence shown is also spoken", mustPass: false, verdicts: () => voiced(ask([say("t1:0", 7208, "Start with check three."), voice("t1:0", 7315, 1000), say("t1:1", 7954, "Then four, five and six in order.")]), {}, 12000) },
  { name: "a sentence he cut off after its first word", check: "The voice says the same words", mustPass: true, verdicts: () => voiced(ask([...sentence, { at: 6200, kind: "voiced", of: "t1:0", words: ["First"] }]), {}, 6400) },
  { name: "a sentence spoken in fewer words with no cut", check: "The voice says the same words", mustPass: false, verdicts: () => voiced(ask([...sentence, { at: 6200, kind: "voiced", of: "t1:0", words: ["First"] }]), {}, null) },
  { name: "a question cut short to one word", check: "His whole question is heard", mustPass: false, verdicts: () => heardWhole(ask([]), "Which line here is about passwords?") },
  { name: "a question heard with one word wrong", check: "His whole question is heard", mustPass: true, verdicts: () => heardWhole(ask([{ at: 2900, kind: "heard", text: "Which line here is about pass words?" }]), "Which line here is about passwords?") },
  { name: "the ask he took back speaks after his second press", check: "Nothing of the ask he took back", mustPass: false, verdicts: () => pressedAgain(cutting([say("t1:0", 21000, "The first check means this."), say("t2:0", 24000, "Passwords are on the eighth line.")]), SILENT, { takesBackTheAskBefore: true }) },
  { name: "only the new ask speaks after his second press", check: "Nothing of the ask he took back", mustPass: true, verdicts: () => pressedAgain(cutting([say("t2:0", 24000, "Passwords are on the eighth line.")]), SILENT, { takesBackTheAskBefore: true }) },
  { name: "a worked example with a wrong sum", check: "A sum it says aloud", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Adding 3 to both sides gives k equals 8 plus 3.", { hint: true }), say("t1:1", 9000, "So k is 12.", { hint: true })]), {}, []) },
  { name: "a worked example with a right sum", check: "A sum it says aloud", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Adding 4 to both sides gives y equals 9 plus 4, which is 13.", { hint: true })]), {}, []) },
  { name: "the top rung's example says what it comes to", check: "On the last rung", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Adding 4 to both sides gives y equals 9 plus 4, which is 13.", { hint: true, top: true })]), {}, []) },
  { name: "the top rung's example stops at the move", check: "On the last rung", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Adding 4 to both sides gives y equals 9 plus 4.", { hint: true, top: true })]), {}, []) },
  { name: "a bracket takes two rows by their names", check: "A mark lands on", mustPass: true, verdicts: () => marks(ask([marked("bracket", { x: 83, y: 768, w: 86, h: 73 })]), { mark: { on: "December 9-16" } }, TABLE) },
  { name: "the line was underlined in an earlier ask and nothing cleared it", check: "A mark lands on", mustPass: true, verdicts: () => marks(ask([say("t2:0", 6000, "It is the line I already underlined.")]), { mark: { on: "limiter" } }, PAGE, [{ mark: "underline", box }]) },
  { name: "no mark now and none standing from before", check: "A mark lands on", mustPass: false, verdicts: () => marks(ask([say("t2:0", 6000, "It is the line I already underlined.")]), { mark: { on: "limiter" } }, PAGE, []) },
  { name: "the only mark is on the row above the one he means", check: "A mark lands on", mustPass: false, verdicts: () => marks(ask([marked("underline", { x: 545, y: 770, w: 90, h: 15 })]), { mark: { on: "December 9-16" } }, TABLE) },
  { name: "a quick line of fifteen words", check: "A line said while he waits", mustPass: false, verdicts: () => spoken(ask([say("t1:-2", 3400, "The page shows six short links, each on the same long domain followed by a code.", { opener: true })]), {}, []) },
  { name: "a quick line of eight words", check: "A line said while he waits", mustPass: true, verdicts: () => spoken(ask([say("t1:-2", 3400, "Let's look at how these links are built.", { opener: true })]), {}, []) },
  { name: "a passed date with a chip that counts the days since, after the sentence", check: "Every date it says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "The application deadline under Key Application Dates, March 1, 2027, closed 13 days ago."), { at: 6100, kind: "mark", id: "t1:0", mark: "tag", box, label: "closed 13 days ago" }]), {}, DATED) },
  { name: "a due date that is not on the page", check: "Every date it says", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The application is due March 3, so you have two weeks.")]), {}, DATED) },
  { name: "the due date as the page writes it", check: "Every date it says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "The application is due March 1st, and exams run December 9 through 16.")]), {}, DATED) },
  { name: "the date it was asked for is left out", check: "It says", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The deadline is in the spring; check the page.")]), { says: ["March 1"] }, DATED) },
  { name: "the date it was asked for, with a spoken ending", check: "It says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It is due March 1st.")]), { says: ["March 1"] }, DATED) },
  { name: "it says he can still apply after the date", check: "It never says", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The deadline was March 1, but you can still apply today.")]), { neverSays: ["you can still apply"] }, DATED) },
  { name: "it says the date has passed", check: "It never says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "That deadline, March 1, has passed.")]), { neverSays: ["you can still apply"] }, DATED) },
  { name: "a one-row board drawn 17.5 points tall", check: "The board's words are big enough to read", mustPass: false, verdicts: () => readable("C18", 0, 1, { x: 1368, y: 543, w: 336, h: 17.5 }, BOARD_LOOK) },
  { name: "a board the painter says it drew at 8.5 points", check: "The board's words are big enough to read", mustPass: false, verdicts: () => readable("C8", 0, 3, { x: 1112, y: 446, w: 560, h: 160 }, BOARD_LOOK, 8.5) },
  { name: "a board the painter says it drew at 15 points", check: "The board's words are big enough to read", mustPass: true, verdicts: () => readable("C8", 0, 3, { x: 1112, y: 446, w: 560, h: 60 }, BOARD_LOOK, 15) },
  { name: "a two-row board drawn 115.5 points tall", check: "The board's words are big enough to read", mustPass: true, verdicts: () => readable("C8", 0, 2, { x: 1112, y: 446, w: 560, h: 115.5 }, BOARD_LOOK) },
  { name: "another page comes up and the old underline stays over it", check: "When another page comes up", mustPass: false, verdicts: () => [pageChanged(0, standingBefore([mark("t1:0", 5000), { at: 9000, kind: "glance", lines: 30 }], { down: 9000, moments: [{ at: 9000, kind: "glance", lines: 30 }] }).length)] },
  { name: "another page comes up and the look clears what was drawn", check: "When another page comes up", mustPass: true, verdicts: () => [pageChanged(0, standingBefore([mark("t1:0", 5000), { at: 9000, kind: "glance", lines: 30 }, { at: 9100, kind: "clear" }], { down: 9000, moments: [{ at: 9000, kind: "glance", lines: 30 }, { at: 9100, kind: "clear" }] }).length)] },
  { name: "asked to keep a date, it hands the Mac a calendar file for that day", check: "It opens a calendar file for November 22", mustPass: true, verdicts: () => kept(ask([{ at: 5000, kind: "opened", path: ICS }, say("t1:0", 5100, "November 22 is open in your calendar.")]), { keeps: "November 22" }) },
  { name: "asked to keep a date, it only says it did", check: "It opens a calendar file for November 22", mustPass: false, verdicts: () => kept(ask([say("t1:0", 5100, "I've added November 22 to your calendar.")]), { keeps: "November 22" }) },
  { name: "the thing is further down and the way says down", check: "It shows the way to scroll", mustPass: true, verdicts: () => glanced(looked([shownLine(["saw this page"]), { at: 2000, kind: "way", to: "down", toward: "Deadlines" }]), { shows: true, way: { to: "down", toward: "Deadlines" } }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "the thing is further down and the way says up", check: "It shows the way to scroll", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"]), { at: 2000, kind: "way", to: "up", toward: "Deadlines" }]), { shows: true, way: { to: "down", toward: "Deadlines" } }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "the thing is not in view and only words say so", check: "It shows the way to scroll", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"])]), { shows: true, way: { to: "down", toward: "Deadlines" } }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "show me, on the second step of three", check: "The board names row 2", mustPass: true, verdicts: () => walked(ask([{ at: 5000, kind: "board", text: "Officers finish trainings | Submit application | Advisor requirements", now: 1 }, say("t2:0", 5100, "Step 2 of 3: Submit application on EngageSC, by November 22 at 11:59pm.")]), { step: 2 }, RAN) },
  { name: "show me, and the board still names the first row", check: "The board names row 2", mustPass: false, verdicts: () => walked(ask([{ at: 5000, kind: "board", text: "Officers finish trainings | Submit application | Advisor requirements", now: 0 }, say("t2:0", 5100, "Step 2 of 3: Submit application on EngageSC, by November 22 at 11:59pm.")]), { step: 2 }, RAN) },
  { name: "show me, answered as an ordinary question", check: "It says one sentence for step 2", mustPass: false, verdicts: () => walked(ask([{ at: 5000, kind: "board", text: "Officers finish trainings | Submit application | Advisor requirements", now: 1 }, say("t2:0", 5100, "Sure, here is what the page says about applying."), say("t2:1", 5600, "You submit on EngageSC.")]), { step: 2 }, RAN) },
  { name: "the way is down and an arrow stands at the bottom edge, clear of the words", check: "An arrow is drawn at the bottom edge", mustPass: true, verdicts: () => wayDrawn("C18", 0, [WAY_DOWN], { way: { to: "down" } }, [{ at: 2000, what: "way", id: "g1", box: { x: 1188, y: 1039, w: 145, h: 64 } }], DATED, SCREEN) },
  { name: "the way is down and the body draws nothing for it", check: "An arrow is drawn at the bottom edge", mustPass: false, verdicts: () => wayDrawn("C18", 0, [WAY_DOWN], { way: { to: "down" } }, [], DATED, SCREEN) },
  { name: "the way is down and the arrow is drawn at the top", check: "An arrow is drawn at the bottom edge", mustPass: false, verdicts: () => wayDrawn("C18", 0, [WAY_DOWN], { way: { to: "down" } }, [{ at: 2000, what: "way", id: "g1", box: { x: 790, y: 14, w: 145, h: 64 } }], DATED, SCREEN) },
  { name: "the arrow is drawn over a line of the page", check: "The arrow covers no words on the page", mustPass: false, verdicts: () => wayDrawn("C18", 0, [WAY_DOWN], { way: { to: "down" } }, [{ at: 2000, what: "way", id: "g1", box: { x: 120, y: 1000, w: 145, h: 64 } }], [{ id: "foot", text: "If you need accommodations, contact Campus Activities.", box: { x: 100, y: 1010, w: 400, h: 20 } }], SCREEN) },
  { name: "a page's first look, said aloud", check: "A page's first look is also said aloud", mustPass: true, verdicts: () => glanced(looked([shownLine(["saw this page"]), { at: 2100, kind: "voice", of: "g1:0", ms: 400 }]), { shows: true, spoken: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a page's first look that makes no sound", check: "A page's first look is also said aloud", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"])]), { shows: true, spoken: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a later look that is spoken", check: "What a look shows is not spoken", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"]), { at: 2100, kind: "voice", of: "g1:0", ms: 400 }]), { shows: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a look that shows one true line, unspoken", check: "Each step of the trail above the line is true", mustPass: true, verdicts: () => glanced(looked([shownLine(["saw this page", "read 1 USC pages", "found 1 date"])]), { shows: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a trail that says a date was found, shown as a box on the date's own line", check: "Each step of the trail above the line is true", mustPass: true, verdicts: () => glanced(looked([{ ...shownLine(["saw this page", "found 1 date"]), text: "Submit your application on EngageSC before 11:59pm; 8 days left." }, { at: 2000, kind: "mark", id: "g1:0", mark: "box", box }]), { shows: true }, [{ id: "closes", text: "November 22 at 11:59pm: Application closes.", box }], { pages: [KEPT], ranOn: RAN }) },
  { name: "the box takes a whole row, and the date is the shorter piece of it", check: "Each step of the trail above the line is true", mustPass: true, verdicts: () => glanced(looked([{ ...shownLine(["saw this page", "found 1 date"]), text: "Submit your application on EngageSC before 11:59pm; 8 days left." }, { at: 2000, kind: "mark", id: "g1:0", mark: "box", box: { x: 240, y: 126, w: 673, h: 25 } }]), { shows: true }, [{ id: "date", text: "November 22 at 11:59pm:", box: { x: 247, y: 136, w: 195, h: 20 } }, { id: "rest", text: "Application closes. You must submit the form on EngageSC", box: { x: 446, y: 136, w: 460, h: 20 } }], { pages: [KEPT], ranOn: RAN }) },
  { name: "a trail that says six pages were read when the record names one", check: "Each step of the trail above the line is true", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page", "read 6 USC pages", "found 1 date"])]), { shows: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a trail that says a date was found when the line names none", check: "Each step of the trail above the line is true", mustPass: false, verdicts: () => glanced(looked([{ ...shownLine(["saw this page", "found 1 date"]), text: "Fundraising needs approval first; see the rule further down." }]), { shows: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a look that is spoken aloud", check: "What a look shows is not spoken", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"]), voice("g1:0", 2100, 3000)]), { shows: true }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a look that shows a line where it must show nothing", check: "A look shows nothing when it has nothing new to show", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"])]), { shows: false }, DATED, { pages: [], ranOn: RAN }) },
  { name: "a look that stays quiet on a page it has not read", check: "A look shows nothing when it has nothing new to show", mustPass: true, verdicts: () => glanced(looked([]), { shows: false }, DATED, { pages: [], ranOn: RAN }) },
  { name: "a look that draws no board of what is ahead", check: "A look he did not ask for draws no board", mustPass: true, verdicts: () => glanced(looked([shownLine(["saw this page"])]), { shows: true, ahead: ["November 22", "December 1"] }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a look that draws the board of what is ahead", check: "A look he did not ask for draws no board", mustPass: false, verdicts: () => glanced(looked([shownLine(["saw this page"]), { at: 2200, kind: "board", text: "Submit the application: November 22 at 11:59pm → Advisor requirements: December 1" }]), { shows: true, ahead: ["November 22", "December 1"] }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "the walk's board, soonest first", check: "The board of what is ahead runs soonest first", mustPass: true, verdicts: () => walked(ask([{ at: 5000, kind: "board", text: "Submit the application: November 22 at 11:59pm | Advisor requirements: December 1", now: 0 }, say("t2:0", 5100, "Step 1 of 2: Submit the application, by November 22 at 11:59pm.")]), { step: 1, ahead: ["November 22", "December 1"] }, RAN) },
  { name: "the walk's board, with a date already past in it", check: "The board of what is ahead runs soonest first", mustPass: false, verdicts: () => walked(ask([{ at: 5000, kind: "board", text: "Application opens: October 27 | Submit the application: November 22 at 11:59pm", now: 0 }, say("t2:0", 5100, "Step 1 of 2: Application opens, October 27.")]), { step: 1, ahead: ["November 22"] }, RAN) },
  { name: "the walk's board, later date first", check: "The board of what is ahead runs soonest first", mustPass: false, verdicts: () => walked(ask([{ at: 5000, kind: "board", text: "Advisor requirements: December 1 | Submit the application: November 22 at 11:59pm", now: 0 }, say("t2:0", 5100, "Step 1 of 2: Advisor requirements, by December 1.")]), { step: 1, ahead: ["November 22"] }, RAN) },
  { name: "a date from a page read two asks ago, said on another site's page", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t2:0", 6000, "Still ahead: you submit on EngageSC by November 22 at 11:59 pm.")]), {}, DATED, { pages: readSoFar(new Map([["t1", [KEPT]], ["t2", [OTHER]]])).get("t2") ?? [], ranOn: RAN }) },
  { name: "the same date when no earlier ask read its page", check: "Every date it says is on a page it read", mustPass: false, verdicts: () => spoken(ask([say("t2:0", 6000, "Still ahead: you submit on EngageSC by November 22 at 11:59 pm.")]), {}, DATED, { pages: readSoFar(new Map([["t2", [OTHER]]])).get("t2") ?? [], ranOn: RAN }) },
  { name: "a date from a kept page the build gave with the ask", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, inside the Deadlines section.")]), {}, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a date from a kept page that was not given with the ask", check: "Every date it says is on a page it read", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, inside the Deadlines section.")]), {}, DATED, { pages: [], ranOn: RAN }) },
  { name: "a date he said himself, said back to him", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([{ at: 4000, kind: "heard", text: "Is it due November 20?" }, say("t1:0", 6000, "It is not November 20; the page says March 1, 2027.")]), {}, DATED, { pages: [], ranOn: RAN }) },
  { name: "a date the page writes with a colon after it", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Advisors have until December 1, and it closes November 22 at 11:59 pm.")]), {}, COLONS, { pages: [], ranOn: RAN }) },
  { name: "a count of days after a date is not a day of the month", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Your advisor gets a bit longer, until December 1, which is 17 days away.")]), {}, COLONS, { pages: [], ranOn: RAN }) },
  { name: "a time after a date is not a day of the month", check: "Every date it says is on a page it read", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 11.")]), {}, COLONS, { pages: [], ranOn: RAN }) },
  { name: "it says today's date", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Today is November 14, and the page says March 1, 2027.")]), {}, DATED, { pages: [], ranOn: RAN }) },
  { name: "the right count of days to a date", check: "It counts the days to November 22 rightly", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, which is eight days from today.")]), { countsDaysTo: "November 22" }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "seven days said as one week", check: "It counts the days to November 22 rightly", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "You have one week to submit. The application closes next Sunday, November 22, at 11:59 pm.")]), { countsDaysTo: "November 22" }, DATED, { pages: [KEPT], ranOn: new Date("2026-11-15T05:32:00-08:00") }) },
  { name: "eight days said as one week", check: "It counts the days to November 22 rightly", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "You have one week to submit. The application closes November 22 at 11:59 pm.")]), { countsDaysTo: "November 22" }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a count of days that is one too many", check: "It counts the days to November 22 rightly", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, which is nine days from today.")]), { countsDaysTo: "November 22" }, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "it says in its own words that the date has passed", check: "It says that the date has passed", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It was due March 1, and that was two weeks ago.")]), { saysThat: PASSED }, DATED) },
  { name: "it gives a passed date as if it were ahead", check: "It says that the date has passed", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Applications close on March 1, so you'd want everything submitted by then.")]), { saysThat: PASSED }, DATED) },
  { name: "it says it depends on today's date", check: "It says that the date has passed", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Whether it's too late depends on today's date compared with the March 1 deadline.")]), { saysThat: PASSED }, DATED) },
  { name: "a word that only holds the sign inside it", check: "It says that the date has passed", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The Chicago office disclosed that it is due March 1.")]), { saysThat: PASSED }, DATED) },
  { name: "a hint on a plain question", check: "A plain question gets an answer", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Read the highlighted line again, slowly.", { hint: true })]), { plain: true }, []) },
  { name: "his number in a worked example", check: "It never gives the result", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "So a equals 2 plus 9, which is 11.")]), { never: ["11", "eleven"] }, []) },
  { name: "an ask that ends in the failed look", check: "The ask is answered", mustPass: false, verdicts: () => spoken(ask([{ at: 5000, kind: "look", name: "failed", detail: "I lost that answer on my side. Ask me again." }]), {}, []) },
  { name: "a failure told as an error's own text", check: "A failure is told in plain words", mustPass: false, verdicts: () => spoken(ask([{ at: 5000, kind: "look", name: "failed", detail: '[{"code":"too_small"}]' }]), {}, []) },
  { name: "he circles and the whole display is sent", check: "When he circles, the answer is made from", mustPass: false, verdicts: () => [onlyThePart(0, { w: 1280, h: 827 }, { lines: 20, unread: 0 }, DISPLAY)] },
  { name: "he circles and a part is sent", check: "When he circles, the answer is made from", mustPass: true, verdicts: () => [onlyThePart(0, { w: 1136, h: 948 }, { lines: 20, unread: 6 }, DISPLAY)] },
  ...PEN_CASES,
  ...VIDEO_CASES,
  ...LABEL_CASES,
  ...COLUMN_CASES,
];

export async function planted(): Promise<{ name: string; ok: boolean; why: string }[]> {
  return Promise.all(CASES.map(async (c) => {
    const verdict = (await c.verdicts()).find((v) => v.what.startsWith(c.check));
    if (!verdict) return { name: c.name, ok: false, why: `no check named "${c.check}" ran` };
    const ok = verdict.pass === c.mustPass;
    return { name: c.name, ok, why: `${c.check}: ${verdict.pass ? "passes" : "fails"}${ok ? "" : `, and it must ${c.mustPass ? "pass" : "fail"}`} (${verdict.measured.slice(0, 60)})` };
  }));
}
