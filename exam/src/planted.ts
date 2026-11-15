import { board } from "./judge/board.ts";
import { marks } from "./judge/marks.ts";
import { drawnIn } from "./judge/motion.ts";
import { onlyThePart } from "./judge/picture.ts";
import { cutIn, pressedAgain } from "./judge/ending.ts";
import { timing } from "./judge/timing.ts";
import { heardWhole, voiced } from "./judge/voice.ts";
import { spoken } from "./judge/words.ts";
import type { Placed } from "./session.ts";
import type { Box } from "./shape.ts";
import type { Ask, Moment } from "./timeline.ts";
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
const KEPT = { title: "Recognition Process", url: "https://example.edu/recognition", lines: ["Deadlines +", "November 22 at 11:59pm: Application closes."] };
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

// A film made of numbers: the mark's box fills from left to right as `grow` says, from nothing to all of it.
const size = { w: 400, h: 200 };
function film(grow: (ms: number) => number) {
  const filled = (share: number) => {
    const ink = new Uint8Array(size.w * size.h);
    const columns = Math.round(box.w * Math.max(0, Math.min(1, share)));
    for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + columns; x++) ink[y * size.w + x] = 1;
    return ink;
  };
  return { size, ink: async (ms: number) => filled(grow(ms)), changed: async () => filled(0), last: async () => filled(1), restZone: box };
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
  { name: "a due date that is not on the page", check: "Every date it says", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The application is due March 3, so you have two weeks.")]), {}, DATED) },
  { name: "the due date as the page writes it", check: "Every date it says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "The application is due March 1st, and exams run December 9 through 16.")]), {}, DATED) },
  { name: "the date it was asked for is left out", check: "It says", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The deadline is in the spring; check the page.")]), { says: ["March 1"] }, DATED) },
  { name: "the date it was asked for, with a spoken ending", check: "It says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It is due March 1st.")]), { says: ["March 1"] }, DATED) },
  { name: "it says he can still apply after the date", check: "It never says", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "The deadline was March 1, but you can still apply today.")]), { neverSays: ["you can still apply"] }, DATED) },
  { name: "it says the date has passed", check: "It never says", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "That deadline, March 1, has passed.")]), { neverSays: ["you can still apply"] }, DATED) },
  { name: "a date from a kept page the build gave with the ask", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, inside the Deadlines section.")]), {}, DATED, { pages: [KEPT], ranOn: RAN }) },
  { name: "a date from a kept page that was not given with the ask", check: "Every date it says is on a page it read", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, inside the Deadlines section.")]), {}, DATED, { pages: [], ranOn: RAN }) },
  { name: "a date he said himself, said back to him", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([{ at: 4000, kind: "heard", text: "Is it due November 20?" }, say("t1:0", 6000, "It is not November 20; the page says March 1, 2027.")]), {}, DATED, { pages: [], ranOn: RAN }) },
  { name: "a date the page writes with a colon after it", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Advisors have until December 1, and it closes November 22 at 11:59 pm.")]), {}, COLONS, { pages: [], ranOn: RAN }) },
  { name: "a time after a date is not a day of the month", check: "Every date it says is on a page it read", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 11.")]), {}, COLONS, { pages: [], ranOn: RAN }) },
  { name: "it says today's date", check: "Every date it says is on a page it read", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "Today is November 14, and the page says March 1, 2027.")]), {}, DATED, { pages: [], ranOn: RAN }) },
  { name: "the right count of days to a date", check: "It counts the days to November 22 rightly", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "It closes November 22 at 11:59 pm, which is eight days from today.")]), { countsDaysTo: "November 22" }, DATED, { pages: [KEPT], ranOn: RAN }) },
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
  { name: "a mark that pops in", check: "Each mark is drawn by a pen", mustPass: false, verdicts: () => drawnIn(film((ms) => (ms >= 1000 ? 1 : 0)), ask([]), [{ at: 1000, what: "mark", id: "t1/0", box }], Infinity) },
  { name: "a mark drawn in 400 ms", check: "Each mark is drawn by a pen", mustPass: true, verdicts: () => drawnIn(film((ms) => (ms - 1000) / 400), ask([]), [{ at: 1000, what: "mark", id: "t1/0", box }], Infinity) },
];

export async function planted(): Promise<{ name: string; ok: boolean; why: string }[]> {
  return Promise.all(CASES.map(async (c) => {
    const verdict = (await c.verdicts()).find((v) => v.what.startsWith(c.check));
    if (!verdict) return { name: c.name, ok: false, why: `no check named "${c.check}" ran` };
    const ok = verdict.pass === c.mustPass;
    return { name: c.name, ok, why: `${c.check}: ${verdict.pass ? "passes" : "fails"}${ok ? "" : `, and it must ${c.mustPass ? "pass" : "fail"}`} (${verdict.measured.slice(0, 60)})` };
  }));
}
