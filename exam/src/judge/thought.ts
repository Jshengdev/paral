import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import { of, spoken, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C29: while it thinks, a line of its own that is already written shows dim in the capsule. The sixth of the six
// his click of 2026-11-15, 18:47 made bars, built the way he clicked on 2026-11-16 (the fourth of four ways counted
// on 143 recorded asks). From the reference's video cut at five frames a second:
//   02:09.4 to 02:10.0   a dim, upright line of its own stands in the capsule, then the spoken line takes its place
//   21:48.4              his own words show in grey italics while he talks; the dim line is upright
// Ours, as clicked: while he talks the mind sends each written draft's line (`thought`: its text, how many of his
// words it had heard, and when), only from a draft that heard six words or more. The body shows the newest one from
// the moment his finger lifts until the first line of that hold is said. That first line is the dim line's own
// words when its draft fits his final words, and the fixed line when it does not: never another line of its own.
//
// The mind hears of the release about 0.3 s late and keeps sending until then, so which line was shown is read by
// stamps, not by the order of the record's lines: the newest thought stamped at or before his finger lifting.
// The film's record lists the dim line (`what: "thought"`, with what it `says`) each time its words or its place
// change, and with null when it goes. Whether it looks dim and upright under his own words is a reader's, kept in
// the readings of the three long questions like every other reading.

// The film is thirty frames a second. A thing drawn with the moment it belongs to is in the record within three frames.
const FRAME_MS = 34;
const SETTLE_MS = 100;
// His click: "only from a draft that heard six words or more". Below six, 4 of 35 replayed lines named a wrong part.
const HEARD_LEAST = 6;

const SHOWS = "A line written while he talked shows dim the moment he lets go";
const QUIET = "No dim line while he is still talking";
const GOES = "The dim line goes when its first line is said";
const SAME = "After a dim line he hears that line or the fixed line";
const SENT = "A dim line is only a line the mind sent in that hold";
const HEARD = "Only a draft that heard six words or more is shown dim";

/** The build's own fixed quick lines, read from its settings by their names: after a dim line he may hear one of these. */
export async function fixedLines(build: string): Promise<string[]> {
  const settings = await readFile(join(build, "mind", "settings", "opener.ts"), "utf8");
  return ["openerFallback", "openerInLesson"].map((name) => {
    const found = settings.match(new RegExp(`${name}: \\{\\s*value: "([^"]+)"`));
    if (!found) throw new Error(`mind/settings/opener.ts names no ${name}: the judge cannot tell a fixed line from a line of its own`);
    return found[1];
  });
}

/** One hold: his press to the next press or look (`until`). `fixed` are the build's own fixed quick lines. */
export function dimLine(ask: Ask, expect: Expect, placed: Placed[], until: number, fixed: string[]): Verdict[] {
  if (ask.up === null) return [];
  const up = ask.up;
  const s = ask.index;
  const thoughts = of(ask.moments, "thought");
  const out: Verdict[] = [];
  const short = thoughts.find((t) => t.heard < HEARD_LEAST);
  if (thoughts.length > 0) out.push(short ? no("C29", s, HEARD, `"${short.text}" was sent from a draft that had heard ${short.heard} words`) : yes("C29", s, HEARD, `${thoughts.length} sent, the fewest words heard ${Math.min(...thoughts.map((t) => t.heard))}`));
  const sent = thoughts.filter((t) => t.at <= up).at(-1) ?? null;
  if (placed.length === 0) return [...out, unseen("C29", s, SHOWS, "the run has no film")];
  const rows = placed.filter((p) => p.what === "thought" && p.at >= ask.down && p.at < until);
  const drawn = rows.filter((p) => typeof p.says === "string");
  const early = drawn.find((p) => p.at < up - FRAME_MS);
  out.push(early ? no("C29", s, QUIET, `"${early.says}" was shown ${Math.round(up - early.at)} ms before he let go`) : yes("C29", s, QUIET, "none"));
  const stray = drawn.find((p) => p.says !== sent?.text);
  out.push(stray ? no("C29", s, SENT, `it showed "${stray.says}"; ${sent ? `the newest line sent by his release was "${sent.text}"` : "no line had been sent by his release"}`) : yes("C29", s, SENT, drawn.length === 0 ? "none shown" : `"${sent?.text}"`));
  if (sent === null) return expect.dimLine ? [...out, no("C29", s, SHOWS, "no line had been sent by the time he let go; the mind's log says when each draft was written")] : out;
  const shown = drawn.find((p) => p.says === sent.text && p.at >= up - FRAME_MS) ?? null;
  const late = shown === null ? null : Math.round(shown.at - up);
  out.push(shown !== null && shown.at <= up + SETTLE_MS ? yes("C29", s, SHOWS, `"${sent.text}" at ${late} ms from the release`, `${SETTLE_MS} ms`) : no("C29", s, SHOWS, shown === null ? `"${sent.text}" was sent and never shown` : `"${sent.text}" came ${late} ms after the release`, `${SETTLE_MS} ms`));
  if (shown === null) return out;
  // The first line of the hold is said from its first sound; with no voice, from when its words are shown. With no
  // line at all (he pressed again, a failure, nothing asked) the dim line has only to be gone by the next press.
  const said = spoken(ask)[0]?.start ?? of(ask.moments, "say")[0]?.at ?? null;
  const gone = rows.find((p) => p.at > shown.at && p.says === null) ?? null;
  const back = gone === null ? null : drawn.find((p) => p.at > gone.at) ?? null;
  const fault = gone === null ? "it was never taken down" : back ? `it came back ${Math.round(back.at - gone.at)} ms after it went` : said !== null && gone.at > said + SETTLE_MS ? `it stood ${Math.round(gone.at - said)} ms into the line being said` : said !== null && gone.at < said - SETTLE_MS ? `it went ${Math.round(said - gone.at)} ms before its line began` : null;
  out.push(fault ? no("C29", s, GOES, fault) : yes("C29", s, GOES, said === null ? "no line was said; it went before the next press" : `it stood ${Math.round((gone?.at ?? 0) - shown.at)} ms and went as the first line began`));
  const firstLine = of(ask.moments, "say").find((m) => m.opener) ?? null;
  if (firstLine) out.push(firstLine.text === sent.text || fixed.includes(firstLine.text) ? yes("C29", s, SAME, firstLine.text === sent.text ? "the same line" : `the fixed line: "${firstLine.text}"`) : no("C29", s, SAME, `it showed "${sent.text}" and then said "${firstLine.text}"`));
  return out;
}
