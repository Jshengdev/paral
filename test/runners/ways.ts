// The runner for rows about the way arrow's tag: moments of a hand-written run on a drawn page, through the real
// scene and painter. No mind, no service, no window.
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { at, DISPLAY, textOf, type Box } from "./placed.ts";

const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * The way's tag at each moment: the name as it is written on it (cut short with "…" when it does not fit), whether
 * the tag lies on the page's read text, the capsule or the board, and whether it is inside the display.
 */
export function wayTag(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("way-tag", input.rows, input.lines);
  const text = textOf(dir);
  return at(dir, input.at).map(({ placed }) => {
    const tag = placed.find((item) => item.what === "way-tag");
    if (!tag) return { tag: null };
    const on = (what: string) => placed.some((item) => item.what === what && touches(item.box, tag.box));
    const box = tag.box;
    return { tag: { says: tag.id, onText: text.some((line) => touches(line, box)), onTheCapsule: on("capsule"), onTheBoard: on("board"), insideTheDisplay: box.x >= 0 && box.y >= 0 && box.x + box.w <= DISPLAY.w && box.y + box.h <= DISPLAY.h } };
  });
}
