import type { Expect, Truth } from "../shape.ts";
import { of, type Look } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import { dates, datesSaid, daysTo, type Known } from "./dates.ts";
import { marks } from "./marks.ts";

// A look with no key pressed (his choice of 2026-11-14, 19:02: "lets try the B"): on a page it has read, paral
// shows one sentence with a short trail of what it did above it, marks where the thing is, and draws what is still
// ahead. He did not ask, so everything it shows must be true to what it read, and it must stay quiet otherwise.
const C = "C18";

/** What the judge holds about one look. `known.pages` is the pages the build's record says the model was asked about for it. */
export function glanced(look: Look, expect: Expect, truth: Truth[], known: Known): Verdict[] {
  const s = look.index;
  const says = of(look.moments, "say");
  const boards = of(look.moments, "board");
  const drawn = of(look.moments, "mark").length + boards.length;
  if (expect.shows === false) {
    const what = "A look shows nothing when it has nothing new to show";
    return [says.length === 0 && drawn === 0 ? yes(C, s, what, "nothing said, marked or drawn") : no(C, s, what, says[0] ? `it showed: "${says[0].text.slice(0, 90)}"` : `${drawn} things drawn`)];
  }
  const one = "A look he did not ask for shows one sentence";
  if (says.length !== 1) return [no(C, s, one, says.length === 0 ? "nothing was shown" : `${says.length} lines: "${says.map((m) => m.text.slice(0, 40)).join('" / "')}"`)];
  const line = says[0];
  const out = [yes(C, s, one, `"${line.text}", ${Math.round(line.at - look.at)} ms after the look`)];
  const sound = of(look.moments, "voice").length;
  out.push(sound === 0 ? yes(C, s, "What a look shows is not spoken", "no sound was made for it") : no(C, s, "What a look shows is not spoken", `${sound} pieces of sound were sent for it`));
  out.push(trailIsTrue(s, line, known));
  const asAsk = { index: s, moments: look.moments };
  out.push(...marks(asAsk, expect, truth), ...datesSaid(asAsk, expect, truth, known), ...ahead(s, boards.at(-1)?.text ?? null, expect, known));
  // A date that has passed leaves nothing to do, so nothing is added to what is ahead.
  if (expect.board === false) out.push(boards.length === 0 ? yes(C, s, "It adds nothing to what is ahead", "no board was drawn") : no(C, s, "It adds nothing to what is ahead", `it drew: ${boards.at(-1)?.text.slice(0, 90)}`));
  return out;
}

// The trail says what was done, a step at a time, so each step must be so. Two of its steps carry a number: the
// pages read and the dates found. The pages read are the ones the record names for this look; the dates found are
// the ones in the sentence it shows.
function trailIsTrue(s: number, line: { text: string; trail?: string[] }, known: Known): Verdict {
  const what = "Each step of the trail above the line is true";
  const trail = line.trail ?? [];
  if (trail.length === 0) return no(C, s, what, "the line came with no trail");
  const found = new Set(dates(line.text).map((d) => `${d.month} ${d.day}`)).size;
  const wrong = trail.flatMap((step) => {
    const pages = /^read (\d+) .*pages?$/i.exec(step);
    if (pages && Number(pages[1]) !== known.pages.length) return [`"${step}", and the record names ${known.pages.length} for this look`];
    const named = /^found (\d+) dates?$/i.exec(step);
    if (named && Number(named[1]) !== found) return [`"${step}", and the line it shows names ${found}`];
    return [];
  });
  return wrong.length === 0 ? yes(C, s, what, trail.join(" > ")) : no(C, s, what, wrong.join("; "));
}

// What is ahead is drawn as one row. Its dates run soonest first, none of them is already past, and the dates the
// scenario names are among them in that order.
function ahead(s: number, board: string | null, expect: Expect, known: Known): Verdict[] {
  if (expect.ahead === undefined) return [];
  const what = "The board of what is ahead runs soonest first, with nothing already past";
  if (board === null) return [no(C, s, what, "no board was drawn")];
  const days = dates(board).map((d) => ({ said: d.said, days: daysTo(known.ranOn, d.month, d.day) }));
  const past = days.find((d) => d.days < 0);
  const late = days.find((d, index) => index > 0 && d.days < days[index - 1].days);
  const order = past ? no(C, s, what, `${past.said} was ${-past.days} days ago`) : late ? no(C, s, what, `${late.said} comes after a later date`) : yes(C, s, what, board);
  const lower = board.toLowerCase();
  const places = expect.ahead.map((date) => lower.indexOf(date.toLowerCase()));
  const named = `The board holds ${expect.ahead.join(", then ")}`;
  const held = places.every((at) => at >= 0) && places.every((at, index) => index === 0 || at > places[index - 1]);
  return [order, held ? yes(C, s, named, board) : no(C, s, named, board)];
}

// The judge's own proposal, not a bar he was shown: a mark is drawn for one page. When the look sees another page
// come up, a ring left over it points at nothing. Seen 2026-11-14: he went from the club page to another site, and
// two underlines, a box and a board stayed over it until he next asked something.
export function pageChanged(s: number, standing: number): Verdict {
  const what = "When another page comes up, the marks drawn for the page before are cleared";
  return standing === 0 ? yes(C, s, what, "nothing of the page before is left over it") : no(C, s, what, `${standing} marks drawn for the page before are still on the screen`);
}
