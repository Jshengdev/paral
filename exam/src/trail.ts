import type { Box } from "./shape.ts";

export type Point = [ms: number, x: number, y: number];

const LOOPS = 1.5;
const EVERY_MS = 16;
const MARGIN = 18;

// The pointer path of someone circling a thing while they talk: an ellipse round its box, a loop and a half.
export function circling(box: Box, lastsMs: number): Point[] {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const rx = box.w / 2 + MARGIN;
  const ry = box.h / 2 + MARGIN;
  const points: Point[] = [];
  for (let ms = 0; ms <= lastsMs; ms += EVERY_MS) {
    const turn = (ms / lastsMs) * LOOPS * 2 * Math.PI - Math.PI / 2;
    points.push([ms, Math.round(cx + rx * Math.cos(turn)), Math.round(cy + ry * Math.sin(turn))]);
  }
  return points;
}
