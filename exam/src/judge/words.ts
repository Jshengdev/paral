import type { Expect, Truth } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";

const SMALL_WORDS = new Set("the a an and or of to in on is it this that with for you your i my me what how can does do be are was at as by from one each then here there about into its not".split(" "));
// Words are runs of letters and digits, with a plural's last "s" dropped, so "links" meets "link" and a spoken
// "trycloudflare" meets the page's "quiet-harbor-demo.trycloudflare.com".
const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g)?.map((w) => (w.length > 4 ? w.replace(/s$/, "") : w)) ?? [];
const plain = (text: string) => text.toLowerCase().replace(/[−–—]/g, "-").replace(/\s+/g, " ");

// Signs that a line is about its own workings, or speaks of him as someone else. Each was said aloud once on film:
// "what the student is asking" (the second pass), and a line that ended "so I will say NONE" in its short form (the
// seventh). "The student calendar" on a university's own page is not one: there the word names a thing on the page.
// A reader still judges the rest.
const HIM_AS_SOMEONE_ELSE = /\b(the|a) (student|user|learner)('s| is| has| was| wants| asked| needs| should| can)\b/i;
const WORKINGS = [/\bNONE\b/, /\bI.ll say\b/i, HIM_AS_SOMEONE_ELSE, /\bas an AI\b/i, /\bmy (instructions|prompt)\b/i];

// The ear must hear the whole question. A hold cut short leaves a word or two. The ear mishears a word now and
// then ("forged" as "forced"), so the words are counted, not matched.
const HEARD_SHARE = 0.7;

export function heardWhole(ask: Ask, said: string): Verdict[] {
  const count = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  if (count(said) === 0) return [];
  const heard = count(of(ask.moments, "heard").at(-1)?.text ?? "");
  const measured = `${heard} words heard of ${count(said)} said`;
  return [heard >= HEARD_SHARE * count(said) ? yes("C2", ask.index, "His whole question is heard", measured) : no("C2", ask.index, "His whole question is heard", measured)];
}

// Signs of a piece that was cut off from its sentence. Each was said aloud on film in the passes of 13:00 on
// 11-14, where a long sentence had been cut at a comma: "Which is 13.", "Like a two or three letter name on a short
// ending." and "Take y minus 4 equals 9: to clear the minus 4." A reader still judges the rest.
const CUT_OFF = [/^Which\b.*\.$/, /^Like (a|an|the|when|if)\b/, /:\s+to(\s+\S+){1,5}\.$/i];

// A sum said aloud with what it comes to, as "9 plus 4, which is 13" or "8 plus 3. So k is 11". On film on 11-14 a
// worked example said "k equals 8 plus 3. So k is 12": eleven was his own answer, which it may not say.
const SUM = /\b(\d+) (plus|minus) (\d+)\b(?:,? which is| really is| is|\. So \w+ is|\. So \w+ equals|, so \w+ is|, so \w+ equals|, and \w+ is|, giving \w+ equals) (\d+)\b/g;

function sumsRight(ask: Ask): Verdict[] {
  const text = of(ask.moments, "say").filter((m) => !m.opener).map((m) => m.text).join(" ");
  const sums = [...text.matchAll(SUM)].map((m) => ({ said: m[0], is: m[2] === "plus" ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]), given: Number(m[4]) }));
  if (sums.length === 0) return [];
  const wrong = sums.filter((sum) => sum.is !== sum.given);
  const what = "A sum it says aloud comes out right";
  return [wrong.length === 0 ? yes("C16", ask.index, what, `${sums.length} sums, each right`) : no("C16", ask.index, what, `it said "${wrong[0].said}", and that is ${wrong[0].is}`)];
}

// The last rung works a step on other numbers and stops at the line that shows the move. It leaves the total to him:
// a total said there has twice been a wrong one, said to keep from saying his own answer.
function topRungStops(ask: Ask): Verdict[] {
  const top = of(ask.moments, "say").filter((m) => m.top);
  if (top.length === 0) return [];
  const totals = [...top.map((m) => m.text).join(" ").matchAll(SUM)];
  const what = "On the last rung the example stops before its total";
  return [totals.length === 0 ? yes("C16", ask.index, what, `${top.length} lines, no total said`) : no("C16", ask.index, what, `it said "${totals[0][0]}"`)];
}

export function spoken(ask: Ask, expect: Expect, truth: Truth[]): Verdict[] {
  const s = ask.index;
  const says = of(ask.moments, "say");
  const sentences = says.filter((m) => !m.opener);
  const everything = [...says.map((m) => m.text), ...of(ask.moments, "mark").map((m) => m.label ?? ""), ...of(ask.moments, "board").map((m) => m.text)].join(" ");
  const out: Verdict[] = [];
  if (expect.line !== undefined) {
    const got = says.map((m) => m.text).join(" ");
    out.push(got.trim() === expect.line ? yes("C12", s, `It answers with "${expect.line}"`, got) : no("C12", s, `It answers with "${expect.line}"`, got || "nothing"));
  }
  if (expect.sentences !== undefined) {
    const measured = `${sentences.length} sentences`;
    out.push(sentences.length >= expect.sentences ? yes("C7", s, `The answer comes in at least ${expect.sentences} sentences`, measured) : no("C7", s, `The answer comes in at least ${expect.sentences} sentences`, measured));
    // Shared words are counted in the answer itself: a waiting line that happens to hold a word of the page proves
    // nothing. A hint is not held to this. It says little on purpose, and the ring on his line ties it to the page.
    const answer = [...sentences.map((m) => m.text), ...of(ask.moments, "mark").map((m) => m.label ?? ""), ...of(ask.moments, "board").map((m) => m.text)].join(" ");
    const pageWords = new Set(truth.flatMap((t) => words(t.text)).filter((w) => w.length > 3 && !SMALL_WORDS.has(w)));
    const shared = [...new Set(words(answer))].filter((w) => pageWords.has(w));
    const need = sentences.length >= 2 ? 2 : 1;
    if (!sentences.every((m) => m.hint)) {
      out.push(shared.length >= need ? yes("C13", s, "The answer is about the page in front of him", `it names: ${shared.slice(0, 6).join(", ")}`)
        : no("C13", s, "The answer is about the page in front of him", `it shares ${shared.length} words with the page`));
    }
  }
  const leaks = says.filter((m) => WORKINGS.some((sign) => sign.test(m.text)));
  out.push(leaks.length === 0 ? yes("U6", s, "No line talks about its own workings, or about him as someone else", `${says.length} lines, none does`)
    : no("U6", s, "No line talks about its own workings, or about him as someone else", `it said: "${leaks[0].text.slice(0, 80)}"`));
  out.push(...sumsRight(ask), ...topRungStops(ask));
  // DuckyHelper's own notes for the tutor in the video (version 0.10.32): "a sentence is said once, never twice".
  const twice = says.map((m) => plain(m.text).trim()).filter((text, at, all) => all.indexOf(text) !== at);
  if (says.length > 0) {
    out.push(twice.length === 0 ? yes("C7", s, "A sentence is said once, never twice", `${says.length} lines, each said once`)
      : no("C7", s, "A sentence is said once, never twice", `said twice: "${twice[0].slice(0, 70)}"`));
  }
  const pieces = sentences.filter((m) => CUT_OFF.some((sign) => sign.test(m.text.trim())));
  if (sentences.length > 0) {
    out.push(pieces.length === 0 ? yes("C7", s, "No piece is cut off from its sentence", `${sentences.length} sentences, none shows a sign of it`)
      : no("C7", s, "No piece is cut off from its sentence", `it said, as a sentence: "${pieces[0].text.slice(0, 70)}"`));
  }
  // An ask that ends in the failed look was not answered. If it must fail, it says so in plain words, never as an error's own text.
  const failed = of(ask.moments, "look").find((m) => m.name === "failed");
  out.push(failed ? no("C7", s, "The ask is answered, not failed", `it failed: ${(failed.detail ?? "").replace(/\s+/g, " ").slice(0, 80)}`) : yes("C7", s, "The ask is answered, not failed", "no failure"));
  if (failed) {
    const raw = /[{}\[\]]|"code"|origin|too_small/.test(failed.detail ?? "");
    out.push(raw ? no("U6", s, "A failure is told in plain words", (failed.detail ?? "").replace(/\s+/g, " ").slice(0, 80)) : yes("U6", s, "A failure is told in plain words", failed.detail ?? ""));
  }
  if (expect.plain) {
    // The video answers a question about a plan or a page outright (09:14). The hint ladder is for his own worked problem.
    const hints = says.filter((m) => m.hint);
    const what = "A plain question gets an answer, not a hint";
    out.push(hints.length === 0 ? yes("C13", s, what, "no line is a hint") : no("C13", s, what, `it gave a hint: "${hints[0].text.slice(0, 60)}"`));
  }
  if (expect.never) {
    const leaked = expect.never.filter((phrase) => plain(everything).includes(plain(phrase)));
    out.push(leaked.length === 0 ? yes("C16", s, "It never gives the result", "no line holds it") : no("C16", s, "It never gives the result", `it said: ${leaked.join(", ")}`));
  }
  return out;
}

// The voice service reports the words it spoke, with their times. They must be the words on screen. When he cut
// in, the sentence being said stops part-way, and its spoken words are then the start of the shown ones.
function sameWords(ask: Ask, cutAt: number | null): Verdict[] {
  const s = ask.index;
  const says = new Map(of(ask.moments, "say").map((m) => [m.id, m.text]));
  const voicedWords = new Map<string, string[]>();
  for (const m of of(ask.moments, "voiced")) voicedWords.set(m.of, [...(voicedWords.get(m.of) ?? []), ...m.words]);
  if (voicedWords.size === 0) return [];
  const letters = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cutShort = (shown: string, said: string) => cutAt !== null && letters(shown).startsWith(letters(said));
  const differ = [...voicedWords].filter(([id, list]) => letters(list.join("")) !== letters(says.get(id) ?? "") && !cutShort(says.get(id) ?? "", list.join("")));
  const what = "The voice says the same words the capsule shows";
  return [differ.length === 0 ? yes("C7", s, what, `${voicedWords.size} of ${voicedWords.size} sentences match`)
    : no("C7", s, what, `shown "${(says.get(differ[0][0]) ?? "").slice(0, 40)}", spoken "${differ[0][1].join(" ").slice(0, 40)}"`)];
}

const VOICE_STARTS_MS = 300;   // the voice's first sound comes 95 to 124 ms after a sentence is sent (the mind's log, 20 sentences)

// One writer: every sentence shown is also voiced, unless this run was told the voice is down. `cutAt` is when he
// held the key again: a sentence sent just before that was stopped before its voice could start, as it should be.
export function voiced(ask: Ask, expect: Expect, cutAt: number | null): Verdict[] {
  const s = ask.index;
  const says = of(ask.moments, "say");
  const heard = new Set(of(ask.moments, "voice").map((m) => m.of));
  if (expect.textOnly) {
    const failedLook = of(ask.moments, "look").some((m) => /voice/i.test(`${m.name} ${m.detail ?? ""}`));
    return [
      says.length > 0 && heard.size === 0 ? yes("C15", s, "With the voice down, the words still show", `${says.length} lines shown, none voiced`) : no("C15", s, "With the voice down, the words still show", `${says.length} shown, ${heard.size} voiced`),
      failedLook ? yes("C15", s, "It says the voice is down", "the capsule says so") : no("C15", s, "It says the voice is down", "nothing on screen says so"),
    ];
  }
  const silent = says.filter((m) => !heard.has(m.id) && !(cutAt !== null && cutAt - m.at < VOICE_STARTS_MS));
  if (says.length === 0) return [];
  return [...sameWords(ask, cutAt), silent.length === 0 ? yes("C7", s, "Every sentence shown is also spoken", `${says.length} of ${says.length}`)
    : no("C7", s, "Every sentence shown is also spoken", `${says.length - silent.length} of ${says.length}; silent: "${silent[0].text.slice(0, 40)}"`)];
}
