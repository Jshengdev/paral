import { execFile } from "node:child_process";
import type { Box } from "./shape.ts";

export type Size = { w: number; h: number };

// One picture as raw red, green, blue bytes at a chosen size, read through ffmpeg so the exam needs no image library.
export function pixels(png: string, size: Size): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", ["-loglevel", "error", "-i", png, "-vf", `scale=${size.w}:${size.h}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 }, (error, out) => (error ? reject(error) : resolve(out)));
  });
}

const DIFFERENT = 40;

// The pixels where a frame differs from the bare page: everything the app drew.
export function drawn(frame: Buffer, page: Buffer, size: Size): Uint8Array {
  const ink = new Uint8Array(size.w * size.h);
  for (let i = 0; i < ink.length; i++) {
    const at = i * 3;
    const far = Math.abs(frame[at] - page[at]) + Math.abs(frame[at + 1] - page[at + 1]) + Math.abs(frame[at + 2] - page[at + 2]);
    if (far > DIFFERENT) ink[i] = 1;
  }
  return ink;
}

export function count(ink: Uint8Array, size: Size, box: Box): number {
  let total = 0;
  const x0 = Math.max(0, Math.floor(box.x)), x1 = Math.min(size.w, Math.ceil(box.x + box.w));
  const y0 = Math.max(0, Math.floor(box.y)), y1 = Math.min(size.h, Math.ceil(box.y + box.h));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) total += ink[y * size.w + x];
  return total;
}

// The smallest box that holds every drawn pixel inside `within`, or null when nothing is drawn there.
export function extent(ink: Uint8Array, size: Size, within: Box): Box | null {
  let left = Infinity, top = Infinity, right = -1, bottom = -1;
  const x0 = Math.max(0, Math.floor(within.x)), x1 = Math.min(size.w, Math.ceil(within.x + within.w));
  const y0 = Math.max(0, Math.floor(within.y)), y1 = Math.min(size.h, Math.ceil(within.y + within.h));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!ink[y * size.w + x]) continue;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  return right < 0 ? null : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}
