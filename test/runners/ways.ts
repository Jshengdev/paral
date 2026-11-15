// The runner for rows about the way arrow's tag: moments of a hand-written run on a drawn page, through the real
// scene and painter. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
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

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");

/**
 * The way tag's "Scroll for me" button at each moment: how far the arrow is inked, whether the button is not there,
 * coming or up, what the overlay would take a click on (and what a press sends), whether the button sits under the
 * tag, and whether it lies on the page's read text, the capsule or the board, or outside the display. `still` plays the
 * run with motion reduced.
 */
export function scrollButton(input: { lines: string[]; rows: Written[]; at: number[]; still?: boolean }) {
  const dir = handWritten("scroll-button", input.rows, input.lines);
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  const file = join(dir, "tokens.json");
  writeFileSync(file, JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: input.still === true } }));
  const text = textOf(dir);
  const moments = JSON.parse(execFileSync(headless, ["placed", dir, file, ...input.at.map(String)], { encoding: "utf8" }));
  const hits: { does: string; box: Box }[][] = JSON.parse(execFileSync(headless, ["hits", dir, file, ...input.at.map(String)], { encoding: "utf8" }));
  return moments.map(({ placed, way }: any, index: number) => {
    if (!way) return { way: null, takesAClick: hits[index].map((hit) => hit.does) };
    const tag = placed.find((item: { what: string }) => item.what === "way-tag")?.box as Box;
    const pressable = hits[index].find((hit) => hit.does === "scroll for me")?.box;
    const on = (what: string) => pressable !== undefined && placed.some((item: { what: string; box: Box }) => item.what === what && touches(item.box, pressable));
    return {
      arrow: way.drawn <= 0 ? "not inked" : way.drawn < 1 ? "part inked" : "whole",
      button: way.button <= 0 ? "none" : way.button < 1 ? "coming" : "up",
      takesAClick: hits[index].map((hit) => hit.does),
      ...(pressable
        ? {
            underTheTag: pressable.y >= tag.y + tag.h && Math.abs(pressable.x - tag.x) < 0.5,
            onText: text.some((line) => touches(line, pressable)),
            onTheCapsule: on("capsule"),
            insideTheDisplay: pressable.x >= 0 && pressable.y >= 0 && pressable.x + pressable.w <= DISPLAY.w && pressable.y + pressable.h <= DISPLAY.h,
          }
        : {}),
    };
  });
}
