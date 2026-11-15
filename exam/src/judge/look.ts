import type { Placed } from "../session.ts";
import type { Box, Display, Expect, Truth } from "../shape.ts";
import { of, type Look, type Moment } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";
import { dates, datesSaid, daysTo, type Known } from "./dates.ts";
import { linesUnder, marks } from "./marks.ts";

// A look with no key pressed (his choice of 2026-11-14, 19:02): on a page it has read, paral
// shows one sentence with a short trail of what it did above it and marks where the thing is. By his click of
// 2026-11-15, 14:55, it draws no board: what is still ahead is drawn when he asks or says "show me". He did not ask,
// so everything it shows must be true to what it read, and it must stay quiet otherwise.
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
  // A look that only follows him (after "show me" it re-places the step's box or arrow) is held to its mark or its way alone.
  if (expect.shows === undefined) return [...marks({ index: s, moments: look.moments }, expect, truth), ...wayShown(C, s, look.moments, expect)];
  const one = "A look he did not ask for shows one sentence";
  if (says.length !== 1) return [no(C, s, one, says.length === 0 ? "nothing was shown" : `${says.length} lines: "${says.map((m) => m.text.slice(0, 40)).join('" / "')}"`)];
  const line = says[0];
  const out = [yes(C, s, one, `"${line.text}", ${Math.round(line.at - look.at)} ms after the look`)];
  const sound = of(look.moments, "voice").length;
  if (expect.spoken) out.push(sound > 0 ? yes(C, s, "A page's first look is also said aloud", `${sound} pieces of sound were sent for it`) : no(C, s, "A page's first look is also said aloud", "no sound was made for it"));
  else out.push(sound === 0 ? yes(C, s, "What a look shows is not spoken", "no sound was made for it") : no(C, s, "What a look shows is not spoken", `${sound} pieces of sound were sent for it`));
  // The lines its marks sit on: a date it found may be shown as a box on the date's own line, with no date in the words.
  const markedLines = of(look.moments, "mark").flatMap((m) => linesUnder(m.box, truth).map((t) => t.text));
  out.push(trailIsTrue(s, line, known, markedLines));
  const asAsk = { index: s, moments: look.moments };
  out.push(...marks(asAsk, expect, truth), ...datesSaid(asAsk, expect, truth, known), ...ahead(s, boards.at(-1)?.text ?? null, expect));
  out.push(...wayShown(C, s, look.moments, expect));
  // A date that has passed leaves nothing to do, so nothing is added to what is ahead.
  if (expect.board === false) out.push(boards.length === 0 ? yes(C, s, "It adds nothing to what is ahead", "no board was drawn") : no(C, s, "It adds nothing to what is ahead", `it drew: ${boards.at(-1)?.text.slice(0, 90)}`));
  return out;
}

// The trail says what was done, a step at a time, so each step must be so. Two of its steps carry a number: the
// pages read and the dates found. The pages read are the ones the record names for this look; the dates found are
// the ones in the sentence it shows or on the lines it marks (once the date is in view it boxes the date's own line
// and says what to do, without saying the date again).
function trailIsTrue(s: number, line: { text: string; trail?: string[] }, known: Known, markedLines: string[]): Verdict {
  const what = "Each step of the trail above the line is true";
  const trail = line.trail ?? [];
  if (trail.length === 0) return no(C, s, what, "the line came with no trail");
  const found = new Set([line.text, ...markedLines].flatMap(dates).map((d) => `${d.month} ${d.day}`)).size;
  const wrong = trail.flatMap((step) => {
    const pages = /^read (\d+) .*pages?$/i.exec(step);
    const forThis = (known.forThis ?? known.pages).length;
    if (pages && Number(pages[1]) !== forThis) return [`"${step}", and the record names ${forThis} for this look`];
    const named = /^found (\d+) dates?$/i.exec(step);
    if (named && Number(named[1]) !== found) return [`"${step}", and the line it shows and the lines it marks name ${found}`];
    return [];
  });
  return wrong.length === 0 ? yes(C, s, what, trail.join(" > ")) : no(C, s, what, wrong.join("; "));
}

// On a page with things still ahead, a look draws no board of them: the board waits for his ask or for "show me".
function ahead(s: number, board: string | null, expect: Expect): Verdict[] {
  if (expect.ahead === undefined) return [];
  const what = "A look he did not ask for draws no board: what is ahead waits for his ask";
  return [board === null ? yes(C, s, what, "no board was drawn") : no(C, s, what, `it drew: ${board.slice(0, 90)}`)];
}

/**
 * The board of what is ahead, where it is drawn (the walk's board): its dates run soonest first, none of them is
 * already past, and the dates the scenario names are among them in that order.
 */
export function aheadInOrder(criterion: string, s: number, board: string | null, named: string[], ranOn: Date): Verdict[] {
  const what = "The board of what is ahead runs soonest first, with nothing already past";
  if (board === null) return [no(criterion, s, what, "no board was drawn")];
  const days = dates(board).map((d) => ({ said: d.said, days: daysTo(ranOn, d.month, d.day) }));
  const past = days.find((d) => d.days < 0);
  const late = days.find((d, index) => index > 0 && d.days < days[index - 1].days);
  const order = past ? no(criterion, s, what, `${past.said} was ${-past.days} days ago`) : late ? no(criterion, s, what, `${late.said} comes after a later date`) : yes(criterion, s, what, board);
  const lower = board.toLowerCase();
  const places = named.map((date) => lower.indexOf(date.toLowerCase()));
  const holds = `The board holds ${named.join(", then ")}`;
  const held = places.every((at) => at >= 0) && places.every((at, index) => index === 0 || at > places[index - 1]);
  return [order, held ? yes(criterion, s, holds, board) : no(criterion, s, holds, board)];
}

// The judge's own proposal, not a bar he was shown: a mark is drawn for one page. When the look sees another page
// come up, a ring left over it points at nothing. Seen 2026-11-14: he went from the club page to another site, and
// two underlines, a box and a board stayed over it until he next asked something.
export function pageChanged(s: number, standing: number): Verdict {
  const what = "When another page comes up, the marks drawn for the page before are cleared";
  return standing === 0 ? yes(C, s, what, "nothing of the page before is left over it") : no(C, s, what, `${standing} marks drawn for the page before are still on the screen`);
}


// What he asked for on 2026-11-14, 20:00: arrows that keep him scrolling until the thing is found. When the thing is on this page
// and not in view, the build says which way in a mark's place. It must be the right way, lead to the right thing,
// and come instead of a mark, never beside one. The arrow's drawing is judged on film, not here.
export function wayShown(criterion: string, s: number, moments: Moment[], expect: Expect): Verdict[] {
  if (expect.way === undefined) return [];
  const C = criterion;
  const toward = expect.way.toward;
  const what = `It shows the way to scroll: ${expect.way.to}${toward ? `, toward ${toward}` : ""}`;
  const ways = of(moments, "way");
  const marked = of(moments, "mark").length;
  if (ways.length === 0) return [no(C, s, what, marked > 0 ? "a mark was drawn and no way was shown" : "no way was shown")];
  const way = ways.at(-1)!;
  const right = way.to === expect.way.to && (toward === undefined || way.toward.toLowerCase().includes(toward.toLowerCase()));
  const measured = `${way.to}, toward "${way.toward}"${marked > 0 ? `, with ${marked} marks beside it` : ""}`;
  return [right && marked === 0 ? yes(C, s, what, measured) : no(C, s, what, measured)];
}

// The arrow itself, from where the painter says it put it (the film's drawn.jsonl). It stands at the edge he must
// scroll toward, in the outer third of the screen, and on none of the page's words. A build whose body reads the
// way and draws nothing fails here: he asked to see the arrow.
export function wayDrawn(criterion: string, s: number, moments: Moment[], expect: Expect, placed: Placed[], truth: Truth[], display: Display): Verdict[] {
  if (expect.way === undefined) return [];
  const sent = of(moments, "way").at(-1);
  if (!sent) return [];   // that no way was sent is already said by the check above
  const edge = `An arrow is drawn at the ${expect.way.to === "down" ? "bottom" : "top"} edge`;
  const arrow = placed.filter((p) => p.what === "way" && p.at >= sent.at - 50).at(0);
  if (!arrow) return [no(criterion, s, edge, "the way was sent and no arrow was drawn")];
  const middle = arrow.box.y + arrow.box.h / 2;
  const there = expect.way.to === "down" ? middle > (display.h * 2) / 3 : middle < display.h / 3;
  const measured = `its middle is ${Math.round(middle)} points down a screen ${display.h} tall`;
  const covered = truth.filter((t) => t.box.h < 90 && overlap(arrow.box, t.box) > 0);
  const clear = "The arrow covers no words on the page";
  return [there ? yes(criterion, s, edge, measured) : no(criterion, s, edge, measured),
    covered.length === 0 ? yes(criterion, s, clear, `it stands clear of all ${truth.length} pieces of text`) : no(criterion, s, clear, `it covers "${covered[0].text.slice(0, 40)}"`)];
}

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
