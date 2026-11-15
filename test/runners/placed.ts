// Runners for rows that look at given moments of a hand-written run on a drawn page, through the real scene and
// painter: the arrow that says which way to scroll, and the cursor. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { handWritten, session, type Written } from "./body.ts";

type Box = { x: number; y: number; w: number; h: number };
type Placed = { what: string; id?: string; box: Box };
type Moment = {
  placed: Placed[];
  way: { id: string; to: string; toward: string; drawn: number } | null;
  pointer: { x: number; y: number; ripple: number | null; flight: number | null; tag: boolean; thinking: boolean } | null;
  board: { id: string; now: number | null; appear: number } | null;
  toast: string | null;
};

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const DISPLAY = { w: 1600, h: 1000 };
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const textOf = (dir: string): Box[] => session(dir)[0].lines.map((line: { box: Box }) => line.box);
const at = (dir: string, moments: number[]): Moment[] => JSON.parse(execFileSync(headless, ["placed", dir, join(root, "body", "tokens.json"), ...moments.map(String)], { encoding: "utf8" }));

/**
 * At each moment: whether the arrow is up and, if it is, what it leads to, how far the pen has inked it, which edge
 * of the display it sits at, and whether it lies on the page's text, the capsule or the board.
 */
export function way(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("way", input.rows, input.lines);
  const text = textOf(dir);
  return at(dir, input.at).map(({ placed, way }) => {
    const arrow = placed.find((item) => item.what === "way")?.box;
    if (!way || !arrow) return { arrow: null };
    const on = (what: string) => placed.some((item) => item.what === what && touches(item.box, arrow));
    const middle = arrow.y + arrow.h / 2;
    return {
      arrow: {
        to: way.to,
        toward: way.toward,
        inked: way.drawn <= 0 ? "none" : way.drawn < 1 ? "part" : "whole",
        edge: middle > (DISPLAY.h * 2) / 3 ? "bottom" : middle < DISPLAY.h / 3 ? "top" : "neither",
        insideTheDisplay: arrow.x >= 0 && arrow.y >= 0 && arrow.x + arrow.w <= DISPLAY.w && arrow.y + arrow.h <= DISPLAY.h,
        onText: text.some((line) => touches(line, arrow)),
        onTheCapsule: on("capsule"),
        onTheBoard: on("board"),
      },
    };
  });
}

/**
 * The cursor at each moment of a run in which one line of the page is marked with no key pressed, as a look does it:
 * whether it is up, whether it has moved since the moment before, whether its tip is on the mark or just beside it,
 * whether it lies on the page's text, and whether the ripple that says "here" is spreading.
 */
export function cursor(input: { lines: string[]; markOn: number; kind: string; markAt: number; clearAt: number; then?: Written[]; at: number[] }) {
  // The page is drawn once to learn where the line is; the run is then written with a mark on it.
  const line: Box = textOf(handWritten("cursor-page", [], input.lines))[input.markOn];
  const rows: Written[] = [
    { at: input.markAt, line: { type: "mark", id: "g1", beat: 0, kind: input.kind, box: line } },
    { at: input.markAt, line: { type: "say", id: "g1", beat: 0, text: "This is the date to keep.", trail: ["saw this page", "found the line"] } },
    { at: input.markAt, line: { type: "mute", id: "g1", why: "a look he did not ask for is shown, not spoken" } },
    ...(input.then ?? []),
    { at: input.clearAt, line: { type: "clear" } },
  ];
  const dir = handWritten("cursor", rows, input.lines);
  const text = textOf(dir);
  let before: { x: number; y: number } | null = null;
  return at(dir, input.at).map(({ placed, pointer }) => {
    const drawn = placed.find((item) => item.what === "pointer")?.box;
    const mark = placed.find((item) => item.what === "mark")?.box;
    if (!pointer || !drawn) return { cursor: null };
    const moved = before === null || Math.hypot(pointer.x - before.x, pointer.y - before.y) > 0.5;
    before = pointer;
    const far = !mark ? Infinity : Math.max(mark.x - pointer.x, pointer.x - (mark.x + mark.w), mark.y - pointer.y, pointer.y - (mark.y + mark.h), 0);
    const wears = pointer.thinking ? "the orb that says it is working" : pointer.tag ? "its name tag" : "nothing";
    return { cursor: { moved, tip: far === 0 ? "on the mark" : far <= 12 ? "beside the mark" : "away from it", onText: text.some((box) => touches(box, drawn)), ripple: pointer.ripple === null ? "none" : "spreading", wears } };
  });
}

/**
 * A walk through steps, at each moment of a hand-written run: which row of the board is lit, whether the light lies
 * inside the card, whether the card is where it was the moment before, and whether it is still fading in. And the
 * cursor while an arrow is up: flying to it, at it, and whether it lies on the page's text.
 */
export function steps(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("steps", input.rows, input.lines);
  const text = textOf(dir);
  let before: Box | null = null;
  return at(dir, input.at).map(({ placed, way, pointer, board }) => {
    const card = placed.find((item) => item.what === "board")?.box ?? null;
    const lit = placed.filter((item) => item.what === "step");
    const arrow = placed.find((item) => item.what === "way")?.box;
    const cursor = placed.find((item) => item.what === "pointer")?.box;
    const moved = before !== null && card !== null && (Math.abs(card.x - before.x) > 0.5 || Math.abs(card.y - before.y) > 0.5 || Math.abs(card.w - before.w) > 0.5);
    before = card;
    return {
      litRows: lit.map((item) => Number(item.id?.split("/").at(-1))),
      litInsideTheCard: card !== null && lit.every((item) => item.box.x >= card.x && item.box.y >= card.y && item.box.x + item.box.w <= card.x + card.w && item.box.y + item.box.h <= card.y + card.h),
      cardMoved: moved,
      cardFadingIn: board !== null && board.appear < 1,
      arrow: !way ? "none" : way.drawn <= 0 ? "not inked yet" : way.drawn < 1 ? "part inked" : "whole",
      cursor: !pointer || !cursor ? "none" : pointer.flight === null ? "with a mark" : pointer.flight < 1 ? "flying to the arrow" : arrow && touches(arrow, cursor) ? "at the arrow" : "away from the arrow",
      cursorOnText: cursor ? text.some((box) => touches(box, cursor)) : false,
    };
  });
}

/**
 * The toast that confirms something paral did, at each moment of a hand-written run: whether it is up, and whether it
 * lies inside the display and off the page's text, the capsule, the board and the way arrow.
 */
export function toast(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("toast", input.rows, input.lines);
  const text = textOf(dir);
  return at(dir, input.at).map(({ placed, toast }) => {
    const box = placed.find((item) => item.what === "toast")?.box;
    if (!box) return { toast: null };
    const on = (what: string) => placed.some((item) => item.what === what && touches(item.box, box));
    return {
      toast: {
        says: toast,
        insideTheDisplay: box.x >= 0 && box.y >= 0 && box.x + box.w <= DISPLAY.w && box.y + box.h <= DISPLAY.h,
        atTheBottom: box.y + box.h / 2 > (DISPLAY.h * 2) / 3,
        onText: text.some((line) => touches(line, box)),
        onTheCapsule: on("capsule"),
        onTheBoard: on("board"),
        onTheArrow: on("way"),
      },
    };
  });
}
