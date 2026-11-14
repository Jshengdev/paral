import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import { first, of, shown, sinceUp, spoken, type Ask } from "../timeline.ts";
import { no, unseen, within, yes, type Verdict } from "../verdict.ts";

// Nielsen's response-time limits (Usability Engineering, 1993): 0.1 s feels instant, 1 s keeps a train of thought.
const INSTANT_MS = 100;
const FLOW_MS = 1000;
// The video, one turn with no cut (21:49 to 21:53): he circles and lets go, the opener shows one second later, the ring two.
const OPENER_MS = 1500;
const FIRST_MARK_MS = 2500;
// DuckyHelper's own page: "The spoken sentence starts with its mark", and a first mark may land before any word.
const MARK_LATE_MS = 1000;
// His choice of 2026-11-14: his first words within about 2 s of the press. The half second is
// the allowance every bar taken from the video's whole-second times gets.
const FIRST_WORDS_MS = 2500;
// The video's one uncut turn shows something new every one to two seconds: 21:49, 21:50, 21:51, 21:53.
const DEAD_AIR_MS = 2000;
const INK_HOLDS_MS = 500;   // a pen takes up to half a second to draw a mark (U7), and the eye follows it
const MARK_AFTER_ITS_WORDS_MS = 80;

// When a mark is on screen: the film says so when it can. If not, it is taken to start with its own sentence.
function shownAt(ask: Ask, markId: string, markAt: number, placed: Placed[]): number {
  const drawn = placed.find((p) => p.what === "mark" && p.id === markId.replace(":", "/") && p.at >= ask.down); // the film names a mark "ask/beat"
  if (drawn) return drawn.at;
  const sentence = spoken(ask).find((s) => s.of === markId);
  return sentence ? sentence.start + MARK_AFTER_ITS_WORDS_MS : markAt;
}

// A mark may come before its sentence. It may not trail it.
function withItsSentence(ask: Ask, placed: Placed[]): Verdict[] {
  const heard = spoken(ask);
  const late = of(ask.moments, "mark").flatMap((mark) => {
    const own = heard.find((sentence) => sentence.of === mark.id);
    return own ? [shownAt(ask, mark.id, mark.at, placed) - own.start] : [];
  });
  if (late.length === 0) return [];
  const worst = Math.max(...late);
  const measured = `of ${late.length}, the latest came ${Math.abs(Math.round(worst))} ms ${worst >= 0 ? "after" : "before"} its sentence began`;
  const limit = `${MARK_LATE_MS} ms (DuckyHelper's page: the spoken sentence starts with its mark)`;
  return [worst <= MARK_LATE_MS ? yes("C6", ask.index, "Each mark lands with its sentence, or before it", measured, limit) : no("C6", ask.index, "Each mark lands with its sentence, or before it", measured, limit)];
}

// With no film, the record is all there is: the mind's own word that it is thinking. It comes after the ear's
// grace, so it is later than what he sees. The film's check (frames.ts) is the one that counts when there is a film.
export function thinkingSaid(ask: Ask): Verdict[] {
  const thinking = of(ask.moments, "look").find((m) => m.name === "thinking") ?? null;
  return [within("C4", ask.index, "The mind says it is thinking when he lets go", sinceUp(ask, thinking), 500, "the ear's grace, then at once")];
}

export function timing(ask: Ask, expect: Expect, placed: Placed[]): Verdict[] {
  const s = ask.index;
  const out: Verdict[] = [];
  const listening = of(ask.moments, "look").find((m) => m.name === "listening") ?? null;
  out.push(within("C2", s, "It shows it is listening the moment he presses", listening ? listening.at - ask.down : null, INSTANT_MS, "Nielsen: 0.1 s feels instant"));
  const heard = of(ask.moments, "heard").find((m) => m.text.trim() !== "") ?? null;
  out.push(within("C2", s, "His first words show soon after he starts to talk", heard ? heard.at - ask.down : null, FIRST_WORDS_MS, "his click of 11-14: about 2 s, as the video shows at 11:49 to 11:51"));
  const opener = of(ask.moments, "say").find((m) => m.opener) ?? null;
  const anySay = first(ask.moments, "say");
  if (expect.opener) out.push(within("C5", s, "An opener names what it will do", sinceUp(ask, opener), OPENER_MS, "the video shows it one second in"));
  out.push(within("U2", s, "He sees the first words while he is still in flow", sinceUp(ask, anySay), FLOW_MS, "Nielsen: 1 s keeps the train of thought"));
  // A voice tutor's first words are the ones he hears. The sound starts when its first piece reaches the body.
  const firstSound = spoken(ask)[0]?.start ?? null;
  if (!expect.textOnly && ask.up !== null) out.push(within("U2", s, "He hears the first words while he is still in flow", firstSound === null ? null : firstSound - ask.up, FLOW_MS, "Nielsen: 1 s keeps the train of thought"));
  // The video's two seconds are from a turn where he circled. His own circle coming back counts: it is a mark on the thing he means.
  const mark = first(ask.moments, "mark");
  const echo = first(ask.moments, "echo");
  const firstInk = Math.min(mark ? shownAt(ask, mark.id, mark.at, placed) : Infinity, echo ? echo.at : Infinity);
  const circled = of(ask.moments, "trail").length > 0;
  if (circled && firstInk !== Infinity && ask.up !== null) out.push(within("C6", s, "After he circles, a mark is on screen about two seconds after release", firstInk - ask.up, FIRST_MARK_MS, "the video: release 21:49, ring 21:51"));
  out.push(...withItsSentence(ask, placed), ...brief(ask), deadAir(ask, placed));
  return out;
}

// The video's sentences take 3 to 4 s to say (21:53 to 21:56, 21:57 to 22:00). Twice that is the bar: a sentence
// that runs longer holds everything behind it, and the next sentence waits.
const SENTENCE_MS = 8000;

function brief(ask: Ask): Verdict[] {
  const said = spoken(ask);
  if (said.length === 0) return [];
  const longest = said.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const text = of(ask.moments, "say").find((m) => m.id === longest.of)?.text ?? "";
  const measured = `the longest takes ${((longest.end - longest.start) / 1000).toFixed(1)} s: "${text.slice(0, 60)}"`;
  const limit = `${SENTENCE_MS / 1000} s (the video's sentences take 3 to 4 s)`;
  return [longest.end - longest.start <= SENTENCE_MS ? yes("C7", ask.index, "No sentence takes long to say", measured, limit) : no("C7", ask.index, "No sentence takes long to say", measured, limit)];
}

// The longest stretch after release with nothing new to hear or see. A sentence counts while it is said, and a mark
// or a board counts while it is drawn: the video fills the wait for its first sentence with a ring, not with words.
// A look that only shows waiting is not counted.
function deadAir(ask: Ask, placed: Placed[]): Verdict {
  const what = "No long stretch after he lets go with nothing new to hear or see";
  if (ask.up === null) return unseen("U3", ask.index, what, "the key was never released");
  const said = spoken(ask).length > 0 ? spoken(ask) : shown(ask);
  if (said.length === 0) return unseen("U3", ask.index, what, "nothing was said in this ask");
  const until = said.at(-1)!.end;
  const ink = placed.filter((p) => ["mark", "echo", "board"].includes(p.what) && p.at >= ask.up! && p.at <= until).map((p) => ({ start: p.at, end: p.at + INK_HOLDS_MS }));
  let longest = 0;
  let quietFrom = ask.up;
  for (const span of [...said, ...ink].sort((a, b) => a.start - b.start)) {
    if (span.start > quietFrom) longest = Math.max(longest, span.start - quietFrom);
    quietFrom = Math.max(quietFrom, span.end);
  }
  const measured = `longest ${Math.round(longest)} ms`;
  return longest <= DEAD_AIR_MS ? yes("U3", ask.index, what, measured, `${DEAD_AIR_MS} ms`) : no("U3", ask.index, what, measured, `${DEAD_AIR_MS} ms`);
}
