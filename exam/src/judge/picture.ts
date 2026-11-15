import { existsSync } from "node:fs";
import { pixels, sizeOf, type Size } from "../pixels.ts";
import type { Display } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

const LOOK_WIDE = 640;   // the picture is looked at this wide: a pen stroke is still two pixels across
const FEW = 60;          // pixels of the pen's colour below this are noise
const SAME_SHAPE = 0.03; // a part of the screen has another shape than the whole; this much apart counts as another

// The pen is a strong orange-red. A page's own reds and golds are darker or yellower, so they are not counted.
const isPen = (r: number, g: number, b: number) => r > 200 && g > 50 && g < 130 && b < 90;

// What the answer is made from when he circles: one picture with his path on it, and only the part of the screen
// round it. This is the last picture of the ask. An earlier one, taken as he pressed, holds the whole page: the
// quick line is written from its read lines, so those do leave the Mac (his choice of 2026-11-14, 17:30: say so).
// A run keeps one picture file, written again on each ask he circles in, so every ask is judged on the last of them.
export async function pictureSent(ask: Ask, circled: boolean, display: Display): Promise<Verdict[]> {
  if (!circled) return [];
  const sent = of(ask.moments, "picture").at(-1);
  if (!sent || !existsSync(sent.path)) return [unseen("C3", ask.index, "The picture sent to the tutor holds his path", "the run names no picture, or its file is gone")];
  const size = await sizeOf(sent.path);
  return [await holdsHisPath(ask.index, sent.path, size), onlyThePart(ask.index, size, sent, display)];
}

async function holdsHisPath(s: number, path: string, picture: Size): Promise<Verdict> {
  const size = { w: LOOK_WIDE, h: Math.round((LOOK_WIDE * picture.h) / picture.w) };
  const seen = await pixels(path, size);
  let pen = 0;
  for (let i = 0; i < size.w * size.h; i++) if (isPen(seen[i * 3], seen[i * 3 + 1], seen[i * 3 + 2])) pen++;
  const measured = `${pen} pixels of the pen's colour in it`;
  return pen > FEW ? yes("C3", s, "The picture sent to the tutor holds his path", measured) : no("C3", s, "The picture sent to the tutor holds his path", measured);
}

// A part shows in two ways: the picture has another shape than the display, or some lines came with a place and no
// words. The exam's circles are small, so the whole display sent here is a fault.
export function onlyThePart(s: number, picture: Size, sent: { lines: number; unread: number }, display: Display): Verdict {
  const whole = display.w / display.h;
  const shapeApart = Math.abs(picture.w / picture.h - whole) / whole;
  const measured = `the picture is ${picture.w} by ${picture.h}; the display's shape is ${display.w} by ${display.h}; ${sent.unread} of ${sent.lines} lines came with no words`;
  const part = shapeApart > SAME_SHAPE || sent.unread > 0;
  return part ? yes("C3", s, "When he circles, the answer is made from only that part", measured) : no("C3", s, "When he circles, the answer is made from only that part", measured);
}
