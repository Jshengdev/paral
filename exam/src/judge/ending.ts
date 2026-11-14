import type { Expect } from "../shape.ts";
import { loudness, type Sound } from "../sound.ts";
import { of, type Ask } from "../timeline.ts";
import { no, unseen, within, yes, type Verdict } from "../verdict.ts";

// C9: when the answer ends it rests again, and what it drew stays.
export function ending(ask: Ask, isLast: boolean): Verdict[] {
  const s = ask.index;
  const looks = of(ask.moments, "look");
  const lastLook = looks.at(-1);
  if (!isLast) return [];
  const cleared = of(ask.moments, "clear").some((m) => m.at > (of(ask.moments, "say").at(-1)?.at ?? Infinity));
  return [
    lastLook?.name === "idle" ? yes("C9", s, "It rests again when the answer ends", "the last look is at rest") : no("C9", s, "It rests again when the answer ends", `the last look is "${lastLook?.name ?? "none"}"`),
    cleared ? no("C9", s, "Its marks stay after the answer", "they were cleared") : yes("C9", s, "Its marks stay after the answer", "nothing cleared them"),
  ];
}

// A line's id is its turn and its place in the turn, as "t2:0".
const turnOf = (id: string) => id.split(":")[0];

// What was left of the ask before must not come after this press: no sentence of it and no mark of it. A line is
// the old ask's when its turn spoke in that ask, or when it is not the turn that speaks last in this one (an ask he
// took back at once had said nothing yet, so only the second sign can show it).
function nothingOfTheOld(ask: Ask, before: Ask, graceMs: number, what: string): Verdict {
  const spoke = (a: Ask) => [...of(a.moments, "say"), ...of(a.moments, "mark")].sort((x, y) => x.at - y.at);
  const lines = spoke(ask);
  const old = new Set(spoke(before).map((m) => turnOf(m.id)));
  const own = lines.length > 0 ? turnOf(lines[lines.length - 1].id) : null;
  const late = lines.filter((m) => (old.has(turnOf(m.id)) || turnOf(m.id) !== own) && m.at - ask.down > graceMs);
  return late.length === 0 ? yes("C11", ask.index, what, "no sentence and no mark of it") : no("C11", ask.index, what, `${late.length} came, the first ${late[0].at - ask.down} ms after the key`);
}

const IN_FLIGHT_MS = 300;   // a line already on its way when the key went down may still cross

// He let go and pressed again at once, with a new question. It must listen, and the ask he took back stays unsaid.
export function pressedAgain(ask: Ask, before: Ask | null, expect: Expect): Verdict[] {
  if (!expect.takesBackTheAskBefore) return [];
  if (!before) return [unseen("C11", ask.index, "Nothing of the ask he took back is said or drawn", "there is no ask before this one")];
  const listening = of(ask.moments, "look").find((m) => m.name === "listening") ?? null;
  return [
    within("C11", ask.index, "It listens at once when he presses again", listening ? listening.at - ask.down : null, 100, "Nielsen: 0.1 s feels instant"),
    nothingOfTheOld(ask, before, IN_FLIGHT_MS, "Nothing of the ask he took back is said or drawn"),
  ];
}

// C11: the ask that cut in. What he hears is on the film's voice track: it must fall silent at once.
const QUIET = 0.01; // loudness below this is silence: speech on these tracks sits near 0.1

export function cutIn(ask: Ask, before: Ask | null, expect: Expect, voice: Sound | null): Verdict[] {
  const stopBy = expect.stopsVoiceWithinMs;
  if (stopBy === undefined) return [];
  const s = ask.index;
  const what = "The voice stops when he cuts in";
  if (!before) return [unseen("C11", s, what, "there is no answer before this ask")];
  const listening = of(ask.moments, "look").find((m) => m.name === "listening") ?? null;
  const out = [within("C11", s, "It listens at once", listening ? listening.at - ask.down : null, 100, "Nielsen: 0.1 s feels instant")];
  out.push(nothingOfTheOld(ask, before, stopBy, "Nothing more of the old answer comes after he cuts in"));
  if (!voice) return [...out, unseen("C11", s, what, "the film has no voice track to listen to")];
  const wasSpeaking = loudness(voice, ask.down - 400, ask.down) > QUIET;
  if (!wasSpeaking) return [...out, unseen("C11", s, what, "nothing was being said when he cut in, so this run proves nothing")];
  const after = loudness(voice, ask.down + stopBy, (ask.up ?? ask.down + 1500));
  return [...out, after <= QUIET ? yes("C11", s, what, `silent ${stopBy} ms after the key`) : no("C11", s, what, `still sounding ${stopBy} ms after the key (loudness ${after.toFixed(3)})`)];
}

// C14: after a close, nothing of it is left on the page.
export function closing(after: Ask): Verdict[] {
  const close = of(after.moments, "close")[0];
  if (!close) return [];
  const cleared = of(after.moments, "clear").find((m) => m.at >= close.at) ?? null;
  return [within("C14", after.index, "Closing clears the marks", cleared ? cleared.at - close.at : null, 100, "Nielsen: 0.1 s feels instant")];
}
