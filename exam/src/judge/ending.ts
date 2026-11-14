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
  // What was left of the old answer must not come after the press: no sentence of it and no mark of it.
  const old = new Set([...of(before.moments, "say"), ...of(before.moments, "mark")].map((m) => turnOf(m.id)));
  const late = [...of(ask.moments, "say"), ...of(ask.moments, "mark")].filter((m) => old.has(turnOf(m.id)) && m.at - ask.down > stopBy);
  const nothingMore = "Nothing more of the old answer comes after he cuts in";
  out.push(late.length === 0 ? yes("C11", s, nothingMore, "no sentence and no mark of it") : no("C11", s, nothingMore, `${late.length} came, the first ${late[0].at - ask.down} ms after the key`));
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
