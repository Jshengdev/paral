/** A box: on the page as shares of its width and height, on screen in points. Origin top left. */
export type Box = { x: number; y: number; w: number; h: number };
export type Side = "left" | "right" | "above" | "below";

/**
 * A page measured once (see `sheets/`): its size, printed lines to find it by, and the spots drawn on it, each with a
 * few words saying what it is.
 */
export type Anchors = {
  name?: string;
  page: { points: { w: number; h: number } };
  lines: { text: string; box: Box }[];
  spots: Record<string, { box: Box; tagSide: Side; what?: string }>;
};

/** A line read from the screen, as the app already has it for each look. */
export type Found = { text: string; box: Box };

/** Where the page sits on screen: screen = scale × page points + shift. `error` is in screen points. */
export type Placed = {
  spots: Record<string, { box: Box; tagSide: Side }>;
  scale: number;
  shift: { x: number; y: number };
  error: number;
  matched: { text: string; read: string }[];
};

/** The most the fit may miss by, as a share of a matched line's height on screen, before the page is not trusted. */
export const MAX_ERROR_SHARE = 0.5;

/** How much the heights count against the centres. The reader's boxes run taller than ink, so they count for less. */
const HEIGHT_WEIGHT = 0.5;

/** Text made comparable: no case, no spaces, and the letters a reader swaps most (0/O, 1/l/I/|) made one. */
const plain = (text: string) => text.toLowerCase().replace(/\s+/g, "").replace(/0/g, "o").replace(/[1i|!]/g, "l");

/** Misread characters a line may carry and still be the line: none for a short line, where one swap makes another. */
const allowed = (length: number) => (length < 6 ? 0 : length < 16 ? 1 : 2);

/** Edit distance between two strings, or `most + 1` as soon as it must be more than `most`. */
function edits(a: string, b: string, most: number): number {
  if (Math.abs(a.length - b.length) > most) return most + 1;
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...next) > most) return most + 1;
    row = next;
  }
  return row[b.length];
}

/**
 * Pairs the page's lines with lines read on screen. A page line is taken only when its text is unique on the page and
 * exactly one screen line reads as it, so a repeated label or a line read twice never pulls the fit.
 */
export function match(anchors: Anchors, found: Found[]): { line: Box; read: Found; text: string }[] {
  const kept = anchors.lines.map((line) => ({ ...line, plain: plain(line.text) }));
  return kept.flatMap((line) => {
    if (kept.filter((other) => other.plain === line.plain).length > 1) return [];
    const most = allowed(line.plain.length);
    const reads = found.filter((read) => edits(line.plain, plain(read.text), most) <= most);
    return reads.length === 1 ? [{ line: line.box, read: reads[0], text: line.text }] : [];
  });
}

const toPoints = (box: Box, page: { w: number; h: number }): Box => ({ x: box.x * page.w, y: box.y * page.h, w: box.w * page.w, h: box.h * page.h });
const centre = (box: Box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

/**
 * One scale and one shift, by least squares over the pairs' centres and (weighted) heights. Same scale across and down,
 * since a page on screen is zoomed, not stretched; no rotation. `error` is the root mean square miss of the centres.
 */
export function fit(pairs: { page: Box; screen: Box }[]): { scale: number; shift: { x: number; y: number }; error: number; misses: number[] } {
  const n = pairs.length;
  const p = pairs.map(({ page }) => centre(page)), q = pairs.map(({ screen }) => centre(screen));
  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / n;
  const px = mean(p.map((c) => c.x)), py = mean(p.map((c) => c.y)), qx = mean(q.map((c) => c.x)), qy = mean(q.map((c) => c.y));
  const w2 = HEIGHT_WEIGHT * HEIGHT_WEIGHT;
  let top = 0, bottom = 0;
  pairs.forEach(({ page, screen }, i) => {
    top += (p[i].x - px) * (q[i].x - qx) + (p[i].y - py) * (q[i].y - qy) + w2 * page.h * screen.h;
    bottom += (p[i].x - px) ** 2 + (p[i].y - py) ** 2 + w2 * page.h ** 2;
  });
  const scale = top / bottom;
  const shift = { x: qx - scale * px, y: qy - scale * py };
  const misses = p.map((c, i) => Math.hypot(scale * c.x + shift.x - q[i].x, scale * c.y + shift.y - q[i].y));
  return { scale, shift, error: Math.sqrt(misses.reduce((sum, m) => sum + m * m, 0) / n), misses };
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/**
 * Each spot's box on screen, from the lines read there. Null when fewer than two lines match, or when the fit misses
 * by more than MAX_ERROR_SHARE of a matched line's height (median). With three or more matched, the worst line is
 * dropped once and the fit tried again, so one wrong match does not throw the page away.
 */
export function place(anchors: Anchors, found: Found[]): Placed | null {
  const page = anchors.page.points;
  let pairs = match(anchors, found).map((m) => ({ page: toPoints(m.line, page), screen: m.read.box, text: m.text, read: m.read.text }));
  if (pairs.length < 2) return null;
  let done = fit(pairs);
  const limit = () => MAX_ERROR_SHARE * median(pairs.map((pair) => pair.screen.h));
  if (done.error > limit() && pairs.length >= 3) {
    const worst = done.misses.indexOf(Math.max(...done.misses));
    pairs = pairs.filter((_, i) => i !== worst);
    done = fit(pairs);
  }
  if (done.error > limit() || !(done.scale > 0)) return null;
  const { scale, shift } = done;
  const spots = Object.fromEntries(
    Object.entries(anchors.spots).map(([name, spot]) => {
      const b = toPoints(spot.box, page);
      return [name, { box: { x: scale * b.x + shift.x, y: scale * b.y + shift.y, w: scale * b.w, h: scale * b.h }, tagSide: spot.tagSide }];
    }),
  );
  return { spots, scale, shift, error: done.error, matched: pairs.map((pair) => ({ text: pair.text, read: pair.read })) };
}
