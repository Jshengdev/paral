import type { Expect, Truth } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import { datesSaid, type Known } from "./dates.ts";
import { ladder } from "./ladder.ts";
import { sentenceForm } from "./sentences.ts";

const SMALL_WORDS = new Set("the a an and or of to in on is it this that with for you your i my me what how can does do be are was at as by from one each then here there about into its not".split(" "));
// Words are runs of letters and digits, with a plural's last "s" dropped, so "links" meets "link" and a spoken
// "trycloudflare" meets the page's "quiet-harbor-demo.trycloudflare.com".
const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g)?.map((w) => (w.length > 4 ? w.replace(/s$/, "") : w)) ?? [];

// Signs that a line is about its own workings, or speaks of him as someone else. Each was said aloud once on film:
// "what the student is asking" (the second pass), and a line that ended "so I will say NONE" in its short form (the
// seventh). "The student calendar" on a university's own page is not one: there the word names a thing on the page.
// A reader still judges the rest.
const HIM_AS_SOMEONE_ELSE = /\b(the|a) (student|user|learner)('s| is| has| was| wants| asked| needs| should| can)\b/i;
const WORKINGS = [/\bNONE\b/, /\bI.ll say\b/i, HIM_AS_SOMEONE_ELSE, /\bas an AI\b/i, /\bmy (instructions|prompt)\b/i];

/** Everything the judge holds about what was said in one ask: the answer itself, its sentences' form, and the hint ladder. */
export function spoken(ask: Ask, expect: Expect, truth: Truth[], known: Known | null = null): Verdict[] {
  return [...oneLine(ask, expect), ...quickLines(ask), ...aboutThePage(ask, expect, truth), aboutHim(ask), ...sentenceForm(ask), ...answered(ask), ...plainAnswer(ask, expect), ...datesSaid(ask, expect, truth, known), ...ladder(ask, expect)];
}

// His click of 2026-11-14 at 16:52: the quick line is twelve words at most. Every line said while he waits is held
// to it, the opener and the waiting lines alike. Whether a quick line is true of his page is a reader's to judge.
const QUICK_WORDS = 12;
const PART_OF_A_WORD = 6; // letters: shorter words sit inside others by chance ("port" in "report")

function quickLines(ask: Ask): Verdict[] {
  const quick = of(ask.moments, "say").filter((m) => m.opener);
  if (quick.length === 0) return [];
  const count = (text: string) => text.trim().split(/\s+/).length;
  const long = quick.filter((m) => count(m.text) > QUICK_WORDS);
  const what = "A line said while he waits is twelve words at most";
  return [long.length === 0 ? yes("C5", ask.index, what, `${quick.length} lines, the longest ${Math.max(...quick.map((m) => count(m.text)))} words`) : no("C5", ask.index, what, `${count(long[0].text)} words: "${long[0].text.slice(0, 70)}"`)];
}

// He circled and said nothing: one fixed line and no more.
function oneLine(ask: Ask, expect: Expect): Verdict[] {
  if (expect.line === undefined) return [];
  const got = of(ask.moments, "say").map((m) => m.text).join(" ");
  const what = `It answers with "${expect.line}"`;
  return [got.trim() === expect.line ? yes("C12", ask.index, what, got) : no("C12", ask.index, what, got || "nothing")];
}

// Shared words are counted in the answer itself: a waiting line that happens to hold a word of the page proves
// nothing. A hint is not held to this. It says little on purpose, and the ring on his line ties it to the page.
function aboutThePage(ask: Ask, expect: Expect, truth: Truth[]): Verdict[] {
  if (expect.sentences === undefined) return [];
  const s = ask.index;
  const sentences = of(ask.moments, "say").filter((m) => !m.opener);
  const enough = `The answer comes in at least ${expect.sentences} sentences`;
  const out = [sentences.length >= expect.sentences ? yes("C7", s, enough, `${sentences.length} sentences`) : no("C7", s, enough, `${sentences.length} sentences`)];
  if (sentences.every((m) => m.hint)) return out;
  const answer = [...sentences.map((m) => m.text), ...of(ask.moments, "mark").map((m) => m.label ?? ""), ...of(ask.moments, "board").map((m) => m.text)].join(" ");
  const pageWords = new Set(truth.flatMap((t) => words(t.text)).filter((w) => w.length > 3 && !SMALL_WORDS.has(w)));
  // An address on the page is one long word, and an answer names its part: "Cloudflare" for "trycloudflare". A long
  // word of the answer that sits inside a word of the page counts (a right answer failed on this, 2026-11-14, 18:46).
  const insideOne = (w: string) => w.length >= PART_OF_A_WORD && [...pageWords].some((p) => p.includes(w));
  const shared = [...new Set(words(answer))].filter((w) => pageWords.has(w) || insideOne(w));
  const need = sentences.length >= 2 ? 2 : 1;
  const what = "The answer is about the page in front of him";
  return [...out, shared.length >= need ? yes("C13", s, what, `it names: ${shared.slice(0, 6).join(", ")}`) : no("C13", s, what, `it shares ${shared.length} words with the page`)];
}

function aboutHim(ask: Ask): Verdict {
  const says = of(ask.moments, "say");
  const leaks = says.filter((m) => WORKINGS.some((sign) => sign.test(m.text)));
  const what = "No line talks about its own workings, or about him as someone else";
  return leaks.length === 0 ? yes("U6", ask.index, what, `${says.length} lines, none does`) : no("U6", ask.index, what, `it said: "${leaks[0].text.slice(0, 80)}"`);
}

// An ask that ends in the failed look was not answered. If it must fail, it says so in plain words, never as an error's own text.
function answered(ask: Ask): Verdict[] {
  const s = ask.index;
  const failed = of(ask.moments, "look").find((m) => m.name === "failed");
  if (!failed) return [yes("C7", s, "The ask is answered, not failed", "no failure")];
  const detail = (failed.detail ?? "").replace(/\s+/g, " ").slice(0, 80);
  const raw = /[{}\[\]]|"code"|origin|too_small/.test(failed.detail ?? "");
  return [
    no("C7", s, "The ask is answered, not failed", `it failed: ${detail}`),
    raw ? no("U6", s, "A failure is told in plain words", detail) : yes("U6", s, "A failure is told in plain words", failed.detail ?? ""),
  ];
}

// The video answers a question about a plan or a page outright (09:14). The hint ladder is for his own worked problem.
function plainAnswer(ask: Ask, expect: Expect): Verdict[] {
  if (!expect.plain) return [];
  const hints = of(ask.moments, "say").filter((m) => m.hint);
  const what = "A plain question gets an answer, not a hint";
  return [hints.length === 0 ? yes("C13", ask.index, what, "no line is a hint") : no("C13", ask.index, what, `it gave a hint: "${hints[0].text.slice(0, 60)}"`)];
}
