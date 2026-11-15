import { findNamed, rowOf, type Box, type Expect, type Truth } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";

const GROWN = 14; // points a mark may sit outside the line it names: a ring goes round it, an underline under it

const grow = (b: Box, by: number): Box => ({ x: b.x - by, y: b.y - by, w: b.w + 2 * by, h: b.h + 2 * by });
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const inside = (inner: Box, outer: Box) => overlap(inner, outer) / (inner.w * inner.h);

// A mark is on a line when most of the mark sits in the line's grown box, and it is nearer that line than any other.
export function nearestLine(box: Box, truth: Truth[]): Truth | null {
  const lines = truth.filter((t) => t.box.h < 90);
  const scored = lines.map((t) => ({ t, share: inside(box, grow(t.box, GROWN)) })).sort((a, b) => b.share - a.share);
  return scored[0] && scored[0].share > 0 ? scored[0].t : null;
}

/** A mark an earlier ask drew that nothing has cleared: it is still on his page when this ask is answered. */
export type Standing = { mark: string; box: Box };

/** The marks still on his page from the asks before this one: every mark drawn since the last clear or close. */
export function standingBefore(all: Ask[], index: number): Standing[] {
  let standing: Standing[] = [];
  for (const moment of [...all.slice(0, index).flatMap((earlier) => earlier.moments), ...of(all[index].moments, "clear")]) {
    if (moment.kind === "clear" || moment.kind === "close") standing = [];
    if (moment.kind === "mark") standing.push({ mark: moment.mark, box: moment.box });
  }
  return standing;
}

// A line that an earlier ask marked, and that nothing cleared, is marked: paral says "the one I already underlined"
// and draws nothing new, and the ink is on his page (seen on film, 2026-11-14, 19:13).
export function marks(ask: Ask, expect: Expect, truth: Truth[], standing: Standing[] = []): Verdict[] {
  const s = ask.index;
  const echoes = of(ask.moments, "echo").map((m) => ({ ...m, mark: "his circle, as a ring" }));
  const now = [...echoes, ...of(ask.moments, "mark")].map((m) => ({ mark: m.mark, box: m.box, earlier: false }));
  const drawn = expect.mark ? [...now, ...standing.map((m) => ({ ...m, earlier: true }))] : now;
  if (expect.mark === null) {
    return [drawn.length === 0 ? yes("C12", s, "No mark is drawn when he says nothing", "no mark") : no("C12", s, "No mark is drawn when he says nothing", `${drawn.length} drawn`)];
  }
  if (expect.mark === undefined) return [];
  const want = findNamed(truth, expect.mark.on);
  if (!want) throw new Error(`the page has no "${expect.mark.on}" to mark`);
  if (drawn.length === 0) return [no("C6", s, `A mark lands on "${want.text.slice(0, 40)}"`, "no mark was drawn")];
  const row = rowOf(want, truth);
  const on = (mark: Box, line: Box) => inside(mark, grow(line, GROWN)) >= 0.6 || inside(line, grow(mark, GROWN)) >= 0.6;
  const hits = drawn.filter((m) => row.some((t) => on(m.box, t.box)));
  const where = drawn.map((m) => `${m.mark}${m.earlier ? ", still there from an earlier ask," : ""} on "${nearestLine(m.box, truth)?.text.slice(0, 28) ?? "no line"}"`).join("; ");
  const out = [hits.length > 0 ? yes("C6", s, `A mark lands on "${want.text.slice(0, 40)}"`, where) : no("C6", s, `A mark lands on "${want.text.slice(0, 40)}"`, where)];
  const kinds = expect.mark.kinds;
  if (kinds && hits.length > 0 && !hits.some((m) => kinds.includes(m.mark))) out.push(no("C6", s, `The mark is one of: ${kinds.join(", ")}`, hits.map((m) => m.mark).join(", ")));
  return out;
}
