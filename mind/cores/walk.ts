import type { Box } from "./ground.ts";

/** A place on the display, in points from its top-left corner. */
export type Point = { x: number; y: number };

/** Whether a point is inside a box grown by `grow` points on every side, so that a click on the box's own edge counts. */
export function inside(at: Point, box: Box, grow: number): boolean {
  return at.x >= box.x - grow && at.x <= box.x + box.w + grow && at.y >= box.y - grow && at.y <= box.y + box.h + grow;
}
