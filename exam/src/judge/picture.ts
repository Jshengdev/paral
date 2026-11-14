import { existsSync } from "node:fs";
import { pixels } from "../pixels.ts";
import type { Box, Display } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

const ROOM = 60;   // points round the thing he circles in which his path is looked for
const FEW = 60;    // pixels of the pen's colour below this are noise

// The tutor gets one picture, and where he circled, his path is drawn on it. The pen is the one strong orange on
// these pages, so the judge counts orange near the thing he circled, in the picture that was really sent.
export async function pathInPicture(ask: Ask, circled: Box | null, display: Display): Promise<Verdict[]> {
  if (circled === null) return [];
  const what = "The picture sent to the tutor holds his path";
  const sent = of(ask.moments, "picture").at(-1);
  if (!sent || !existsSync(sent.path)) return [unseen("C3", ask.index, what, "the run names no picture, or its file is gone")];
  const size = { w: display.w, h: display.h };
  const picture = await pixels(sent.path, size);
  let orange = 0;
  const x0 = Math.max(0, Math.floor(circled.x - ROOM)), x1 = Math.min(size.w, Math.ceil(circled.x + circled.w + ROOM));
  const y0 = Math.max(0, Math.floor(circled.y - ROOM)), y1 = Math.min(size.h, Math.ceil(circled.y + circled.h + ROOM));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * size.w + x) * 3;
    if (picture[i] > 180 && picture[i] - picture[i + 2] > 90 && picture[i] - picture[i + 1] > 40) orange++;
  }
  const measured = `${orange} pixels of the pen's colour round the thing he circled`;
  return [orange > FEW ? yes("C3", ask.index, what, measured) : no("C3", ask.index, what, measured)];
}
