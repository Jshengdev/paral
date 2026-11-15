import type { Expect } from "../shape.ts";
import { of, shownOnly, spoken as aloud, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";

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
// held the key again: a sentence whose turn to be spoken had not come by then was stopped before its voice could
// start, as it should be. Its turn comes when it is sent, or when the sentence before it has been spoken, whichever
// is later (a sentence sent 323 ms before his press, behind one with 4 s still to say, was failed for it once).
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
  const spokenUntil = (before: number) => Math.max(0, ...aloud(ask).filter((one) => one.start < before).map((one) => one.end));
  const turnOf = (m: { at: number }) => Math.max(m.at, spokenUntil(m.at));
  // A line of its own that the mind marks as shown and not spoken (an offer on its card) is not part of the answer.
  const onCard = shownOnly(ask);
  const silent = says.filter((m) => !heard.has(m.id) && !onCard(m.id) && !(cutAt !== null && cutAt - turnOf(m) < VOICE_STARTS_MS));
  if (says.length === 0) return [];
  return [...sameWords(ask, cutAt), silent.length === 0 ? yes("C7", s, "Every sentence shown is also spoken", `${says.length} of ${says.length}`)
    : no("C7", s, "Every sentence shown is also spoken", `${says.length - silent.length} of ${says.length}; silent: "${silent[0].text.slice(0, 40)}"`)];
}
