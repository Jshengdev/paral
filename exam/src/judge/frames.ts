import { existsSync } from "node:fs";
import { join } from "node:path";
import { frameAt, frameCount, framePath } from "../film.ts";
import { count, drawn, pixels, type Size } from "../pixels.ts";
import { findNamed, type Box, type Display, type Expect, type Truth } from "../shape.ts";
import type { Placed } from "../session.ts";
import { of, type Ask } from "../timeline.ts";
import { no, unseen, within, yes, type Verdict } from "../verdict.ts";

const REST_ZONE = { w: 520, h: 150 };   // where the capsule lives: the bottom centre of the display
const MARK_ROOM = 22;                    // points round a line in which its mark is drawn
const COVERED = 0.06;                   // the share of another line's box that may be inked before it counts as covered
const TRAIL_GONE_MS = 1000;              // the video: the trail is gone in the second he lets go (21:48 to 21:49)
const FEW = 30;                          // drawn pixels below this are noise from scaling
const JUST_DRAWN_MS = 800;               // the slowest pen in the tokens takes 650 ms, so by now a mark is whole

export type Seen = { size: Size; ink(ms: number): Promise<Uint8Array>; changed(fromMs: number, toMs: number): Promise<Uint8Array>; last(): Promise<Uint8Array>; restZone: Box };

// Frame 0 is the bare page drawn by the same painter, so any difference from it is something the app drew.
export async function look(dir: string, display: Display): Promise<Seen> {
  const size = { w: display.w, h: display.h };
  const bare = existsSync(framePath(dir, 0)) ? framePath(dir, 0) : join(dir, "page.png");
  const page = await pixels(bare, size);
  const frames = await frameCount(dir) - (existsSync(framePath(dir, 0)) ? 1 : 0);
  const at = async (frame: number) => drawn(await pixels(framePath(dir, Math.min(frames, frame)), size), page, size);
  const frame = (ms: number) => pixels(framePath(dir, Math.max(1, Math.min(frames, frameAt(ms)))), size);
  return { size, ink: (ms) => at(frameAt(ms)), last: () => at(frames), changed: async (fromMs, toMs) => drawn(await frame(toMs), await frame(fromMs), size),
    restZone: { x: (size.w - REST_ZONE.w) / 2, y: size.h - REST_ZONE.h, w: REST_ZONE.w, h: REST_ZONE.h } };
}

const grow = (b: Box, by: number): Box => ({ x: b.x - by, y: b.y - by, w: b.w + 2 * by, h: b.h + 2 * by });
const whole = (size: Size): Box => ({ x: 0, y: 0, w: size.w, h: size.h });

const LOOK_MS = 100;         // Nielsen: 0.1 s feels instant
const LOOK_CHANGED = 1500;   // a new word in the capsule changes about 400 pixels, a new look about 4,000 (one film each)

// He lets go, and the capsule must show it is thinking at once. The film's own account names the capsule's look,
// so that is read first. An older film names no look, and then the changed pixels are counted, which is weaker:
// his own last words arriving can change as many pixels as a new look.
export async function thinkingShown(seen: Seen, ask: Ask, placed: Placed[]): Promise<Verdict[]> {
  if (ask.up === null) return [];
  const what = "The capsule shows it is thinking the moment he lets go";
  const limit = `${LOOK_MS} ms (Nielsen: 0.1 s feels instant)`;
  const up = ask.up;
  if (placed.some((p) => p.what === "capsule" && p.look !== undefined)) {
    const row = placed.find((p) => p.what === "capsule" && p.look === "thinking" && p.at >= up - 40);
    return [within("C4", ask.index, what, row ? Math.max(0, row.at - up) : null, LOOK_MS, "Nielsen: 0.1 s feels instant")];
  }
  const pixelsChanged = count(await seen.changed(up - 40, up + LOOK_MS), seen.size, seen.restZone);
  const measured = `${pixelsChanged} pixels of the capsule changed within ${LOOK_MS} ms`;
  return [pixelsChanged >= LOOK_CHANGED ? yes("C4", ask.index, what, measured, limit) : no("C4", ask.index, what, measured, limit)];
}

export async function atRest(seen: Seen): Promise<Verdict[]> {
  const ink = await seen.ink(0);
  const inZone = count(ink, seen.size, seen.restZone);
  const elsewhere = count(ink, seen.size, whole(seen.size)) - inZone;
  const measured = `${inZone} drawn pixels at the bottom centre, ${elsewhere} elsewhere`;
  return [inZone > FEW && elsewhere <= FEW ? yes("C1", 0, "At rest it is one small thing at the bottom centre", measured) : no("C1", 0, "At rest it is one small thing at the bottom centre", measured)];
}

export async function trail(seen: Seen, ask: Ask, circled: Box | null, placed: Placed[]): Promise<Verdict[]> {
  if (circled === null || ask.up === null) return [];
  const room = grow(circled, 40);
  const during = count(await seen.ink(ask.down + (ask.up - ask.down) * 0.6), seen.size, room);
  const out = [during > FEW ? yes("C3", ask.index, "A trail follows his pointer while he circles", `${during} drawn pixels round the thing he circles`)
    : no("C3", ask.index, "A trail follows his pointer while he circles", "nothing is drawn there while the key is down")];
  // After release his circle may come back as a ring in the same place, so pixels cannot tell the two apart.
  // The film's own account can: it stops listing the trail when the trail is gone.
  const lastTrail = placed.filter((p) => p.what === "trail" && p.at >= ask.down).at(-1);
  if (!lastTrail) return [...out, unseen("C3", ask.index, "The trail is gone soon after he lets go", "the film lists no trail")];
  const lingered = lastTrail.at - ask.up;
  return [...out, lingered <= TRAIL_GONE_MS ? yes("C3", ask.index, "The trail is gone soon after he lets go", `gone ${Math.max(0, Math.round(lingered))} ms after release`, `${TRAIL_GONE_MS} ms`)
    : no("C3", ask.index, "The trail is gone soon after he lets go", `still drawn ${Math.round(lingered)} ms after release`, `${TRAIL_GONE_MS} ms`)];
}

// `settledAt` is a moment when everything this ask drew is on screen: after its last sentence, before the next ask.
// Each mark names the line it sits on. A named line may carry ink beside or under its words; any other line may not.
export async function inked(seen: Seen, ask: Ask, expect: Expect, truth: Truth[], settledAt: number, placed: Placed[], until: number): Promise<Verdict[]> {
  const marks = [...of(ask.moments, "mark"), ...of(ask.moments, "echo")];
  const want = expect.mark ? findNamed(truth, expect.mark.on) : undefined;
  if (marks.length === 0 || !want) return [];
  // Ink is looked at just after each mark is drawn, and once more when the ask has settled, so ink that fades is still judged.
  const drawnAt = placed.filter((p) => (p.what === "mark" || p.what === "echo") && p.at >= ask.down && p.at + JUST_DRAWN_MS < until).map((p) => p.at + JUST_DRAWN_MS);
  const inks = await Promise.all([...drawnAt, settledAt].map((ms) => seen.ink(ms)));
  const most = (b: Box) => Math.max(...inks.map((ink) => count(ink, seen.size, b)));
  const share = (b: Box) => most(b) / (b.w * b.h);
  const holds = (outer: Box, inner: Box) => outer !== inner && outer.x <= inner.x && outer.y <= inner.y && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h;
  const lines = truth.filter((t) => !truth.some((other) => holds(t.box, other.box)));
  // A mark names the one line it overlaps most. His circle, come back as a ring, goes round lines and names none.
  const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const nearest = (box: Box) => lines.map((t) => ({ t, shared: area(box, t.box) })).filter((c) => c.shared > 0).sort((x, y) => y.shared - x.shared)[0]?.t;
  const named = [...new Set(of(ask.moments, "mark").map((m) => nearest(m.box)))].filter((t): t is Truth => t !== undefined);
  const others = lines.filter((t) => !named.includes(t));
  const worstNamed = named.map((t) => ({ t, share: share(t.box) })).sort((x, y) => y.share - x.share)[0];
  const covered = others.map((t) => ({ t, share: share(t.box) })).filter((c) => c.share > COVERED).sort((x, y) => y.share - x.share);
  const near = most(grow(want.box, MARK_ROOM));
  const own = "A mark does not cover the words it marks";
  const clear = "Its ink covers no other text on the page";
  return [
    near > FEW ? yes("C6", ask.index, "The film shows ink at the line it names", `${near} drawn pixels round the line`) : no("C6", ask.index, "The film shows ink at the line it names", "no ink round the line on the film"),
    !worstNamed || worstNamed.share <= 0.25 ? yes("U4", ask.index, own, `${Math.round((worstNamed?.share ?? 0) * 100)}% of the most covered marked line is inked`, "25%")
      : no("U4", ask.index, own, `${Math.round(worstNamed.share * 100)}% of "${worstNamed.t.text.slice(0, 34)}" is inked`, "25%"),
    covered.length === 0 ? yes("U5", ask.index, clear, "no other line is inked") : no("U5", ask.index, clear, `${Math.round(covered[0].share * 100)}% of "${covered[0].t.text.slice(0, 34)}" is inked`, `${COVERED * 100}%`),
  ];
}

export async function atEnd(seen: Seen, lastAsk: Ask, closed: boolean): Promise<Verdict[]> {
  const ink = await seen.last();
  const all = count(ink, seen.size, whole(seen.size));
  const inZone = count(ink, seen.size, seen.restZone);
  const s = lastAsk.index;
  if (closed) return [all - inZone <= FEW ? yes("C14", s, "After a close the page is clean", `${all - inZone} drawn pixels left on the page`) : no("C14", s, "After a close the page is clean", `${all - inZone} drawn pixels left on the page`)];
  const marked = of(lastAsk.moments, "mark").length > 0 || of(lastAsk.moments, "board").length > 0;
  if (!marked) return [];   // an ask that drew nothing has nothing to keep; C12 holds that it drew nothing
  return [all - inZone > FEW ? yes("C9", s, "What it drew is still on the last frame", `${all - inZone} drawn pixels outside the capsule`) : no("C9", s, "What it drew is still on the last frame", "the last frame holds only the capsule")];
}
