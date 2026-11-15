import { of, shownOnly, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import { plain } from "./text.ts";

// Signs of a piece that was cut off from its sentence. Each was said aloud on film in the passes of 13:00 on
// 11-14, where a long sentence had been cut at a comma: "Which is 13.", "Like a two or three letter name on a short
// ending." and "Take y minus 4 equals 9: to clear the minus 4." A reader still judges the rest.
const CUT_OFF = [/^Which\b.*\.$/, /^Like (a|an|the|when|if)\b/, /:\s+to(\s+\S+){1,5}\.$/i];

/** The form of what is said: each line once, and each piece a sentence of its own. */
export function sentenceForm(ask: Ask): Verdict[] {
  return [...saidOnce(ask), ...whole(ask)];
}

// DuckyHelper's own notes for the tutor in the video (version 0.10.32): "a sentence is said once, never twice".
// A card that shows an answer's first sentence again, without speaking it, has not said it twice (the run of 05:21
// on 11-15 was failed for it three times: "the answer stays on a card").
function saidOnce(ask: Ask): Verdict[] {
  const onCard = shownOnly(ask);
  const says = of(ask.moments, "say").filter((m) => !onCard(m.id));
  if (says.length === 0) return [];
  const twice = says.map((m) => plain(m.text).trim()).filter((text, at, all) => all.indexOf(text) !== at);
  const what = "A sentence is said once, never twice";
  return [twice.length === 0 ? yes("C7", ask.index, what, `${says.length} lines, each said once`) : no("C7", ask.index, what, `said twice: "${twice[0].slice(0, 70)}"`)];
}

function whole(ask: Ask): Verdict[] {
  const sentences = of(ask.moments, "say").filter((m) => !m.opener);
  if (sentences.length === 0) return [];
  const pieces = sentences.filter((m) => CUT_OFF.some((sign) => sign.test(m.text.trim())));
  const what = "No piece is cut off from its sentence";
  return [pieces.length === 0 ? yes("C7", ask.index, what, `${sentences.length} sentences, none shows a sign of it`) : no("C7", ask.index, what, `it said, as a sentence: "${pieces[0].text.slice(0, 70)}"`)];
}
