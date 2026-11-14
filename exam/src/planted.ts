import { board } from "./judge/board.ts";
import { drawnIn } from "./judge/motion.ts";
import { onlyThePart } from "./judge/picture.ts";
import { timing } from "./judge/timing.ts";
import { spoken } from "./judge/words.ts";
import type { Placed } from "./session.ts";
import type { Ask, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// A check that cannot fail proves nothing. Each case here is a made-up ask with one fault planted in it, or with
// none, and names the check that must fail or pass on it. `node exam/run.ts planted` runs them all, with no service.
type Case = { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] | Promise<Verdict[]> };

const UP = 3000;
const DISPLAY = { id: 1, scale: 2, x: 0, y: 0, w: 1728, h: 1117 };
const box = { x: 100, y: 80, w: 200, h: 20 };
const PAGE = [{ id: "work", text: "My work", box }, { id: "limiter", text: "The rate limiter keeps its buckets in memory", box }];
const say = (id: string, at: number, text: string, extra: Partial<{ opener: boolean; hint: boolean }> = {}): Moment => ({ at, kind: "say", id, text, opener: extra.opener ?? false, hint: extra.hint ?? false });
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
  { name: "the board opens 2.5 s after the first words", check: "The board opens within two seconds", mustPass: false, verdicts: () => board(ask([...sentence, { at: 6200, kind: "board", text: "a → b" }]), { board: true }, [], []) },
  { name: "a board of one box", check: "The board is a drawing", mustPass: false, verdicts: () => board(ask([...sentence, { at: 4000, kind: "board", text: "Sign up" }]), { board: true }, [], []) },
  { name: "a box that begins with an arrow", check: "No box carries an arrow", mustPass: false, verdicts: () => board(ask([...sentence, { at: 4000, kind: "board", text: "a → → b" }]), { board: true }, [], []) },
  { name: "an empty card that is never filled", check: "An empty card", mustPass: false, verdicts: () => board(ask([...sentence, { at: 3500, kind: "board", text: "" }]), {}, [], []) },
  { name: "an empty card that is taken away", check: "An empty card", mustPass: true, verdicts: () => board(ask([...sentence, { at: 3500, kind: "board", text: "" }, { at: 5000, kind: "board-closed" }]), {}, [], []) },
  { name: "a line that says NONE", check: "No line talks about its own workings", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "This is a student's own summary, so I'll say NONE.")]), {}, []) },
  { name: "an opener that speaks of him as the student", check: "No line talks about its own workings", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Let's sort out what the student is asking about the domain.")]), {}, []) },
  { name: "a line about the student calendar on the page", check: "No line talks about its own workings", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "That policy covers faculty and staff, not the student calendar below.")]), {}, []) },
  { name: "the rung's fixed line said twice in one answer", check: "A sentence is said once", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Read the highlighted line again, slowly.", { hint: true }), say("t1:1", 9000, "Read the highlighted line again, slowly.", { hint: true })]), {}, []) },
  { name: "an answer that names nothing on the page", check: "The answer is about the page", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Bananas are yellow and grow in bunches.")]), { sentences: 1 }, PAGE) },
  { name: "only a waiting line shares a word with the page", check: "The answer is about the page", mustPass: false, verdicts: () => spoken(ask([say("t1:-2", 5000, "Give me a moment to work it out.", { opener: true }), say("t1:0", 6000, "Bananas are yellow and grow in bunches.")]), { sentences: 1 }, PAGE) },
  { name: "an answer that names the page's limiter", check: "The answer is about the page", mustPass: true, verdicts: () => spoken(ask([say("t1:0", 6000, "The rate limiter is the one to worry about.")]), { sentences: 1 }, PAGE) },
  { name: "a hint on a plain question", check: "A plain question gets an answer", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "Read the highlighted line again, slowly.", { hint: true })]), { plain: true }, []) },
  { name: "his number in a worked example", check: "It never gives the result", mustPass: false, verdicts: () => spoken(ask([say("t1:0", 6000, "So a equals 2 plus 9, which is 11.")]), { never: ["11", "eleven"] }, []) },
  { name: "an ask that ends in the failed look", check: "The ask is answered", mustPass: false, verdicts: () => spoken(ask([{ at: 5000, kind: "look", name: "failed", detail: "I lost that answer on my side. Ask me again." }]), {}, []) },
  { name: "a failure told as an error's own text", check: "A failure is told in plain words", mustPass: false, verdicts: () => spoken(ask([{ at: 5000, kind: "look", name: "failed", detail: '[{"code":"too_small"}]' }]), {}, []) },
  { name: "he circles and the whole display is sent", check: "When he circles, only that part", mustPass: false, verdicts: () => [onlyThePart(0, { w: 1280, h: 827 }, { lines: 20, unread: 0 }, DISPLAY)] },
  { name: "he circles and a part is sent", check: "When he circles, only that part", mustPass: true, verdicts: () => [onlyThePart(0, { w: 1136, h: 948 }, { lines: 20, unread: 6 }, DISPLAY)] },
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
