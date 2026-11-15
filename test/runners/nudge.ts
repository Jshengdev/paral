// Runners for rows about the nudge card, the card a line said without being asked comes up on: moments of a
// hand-written run on a drawn page through the real scene and painter, and lines read by the body's own seam reader.
// No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { onTheirLines } from "./leads.ts";
import { at, DISPLAY, textOf, type Box } from "./placed.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const places = (value: number) => Math.round(value * 100) / 100;
/** Everything else the painter places, which the card must keep off. */
const PIECES = ["mark", "echo", "pointer", "tag", "capsule", "cross", "board", "clip", "way", "toast", "guide"];

/**
 * The nudge card at each moment: what it says and the steps above its words; whether it is coming up, up or going;
 * which buttons it offers to be clicked (the boxes the window takes clicks on), and whether those lie inside the
 * card; whether it lies inside the display, on any of the page's read lines, or on any other piece; where it is
 * against the line it is about (level with that line and to the right of all the text at its height, only to the
 * right of the text, elsewhere, or with no line); and whether the drawn arrow leads to it. Also the capsule's look
 * and whether the toast is up. `notNow` are the moments he pressed "Not now"; `motion` adds how far the card, each of
 * its rows and its going have come, and how many of its words are in ink. `still` plays the run with motion reduced.
 * A row writes a voice line by its length (`ms`); here it becomes that much silence at the voice's 24 kHz. `words`
 * adds what the card's offer button says and what the toast says.
 */
export function nudge(input: { lines: string[]; rows: Written[]; at: number[]; notNow?: number[]; motion?: boolean; still?: boolean; words?: boolean }) {
  const rows = onTheirLines(input.rows, input.lines).map((row) => {
    if (row.line.type !== "voice" || typeof row.line.ms !== "number") return row;
    const { ms, ...line } = row.line;
    return { at: row.at, line: { ...line, pcm: Buffer.alloc(ms * 48).toString("base64") } };
  });
  const dir = handWritten("nudge", rows, input.lines);
  const text = textOf(dir);
  // The line each look marked, by the look's id: the card of that look is about it.
  const marked = new Map(rows.filter((row) => row.line.type === "mark").map((row) => [row.line.id, row.line.box as Box]));
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  writeFileSync(join(dir, "tokens.json"), JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: input.still === true } }));
  const moments: ReturnType<typeof at> = input.still
    ? JSON.parse(execFileSync(headless, ["placed", dir, join(dir, "tokens.json"), ...input.at.map(String)], { encoding: "utf8", env: { ...process.env, PARAL_NOT_NOW: (input.notNow ?? []).join(",") } }))
    : at(dir, input.at, false, 0, input.notNow ?? []);
  return moments.map(({ placed, nudge, capsule, toast }) => {
    const card = placed.find((item) => item.what === "nudge");
    const also = { capsule: capsule.look, toast: input.words ? toast : toast !== null };
    // With no place clear of the page's words the card is not drawn and its line is in the capsule: what it says
    // there, whether the capsule lies on any read line, and whether the arrow leads there.
    const instead = placed.find((item) => item.what === "nudge-in-capsule");
    if (nudge && instead) return { card: null, inTheCapsule: { says: nudge.text, onText: text.some((other) => touches(other, instead.box)), arrowLeadsToIt: placed.some((item) => item.what === "lead" && item.id?.endsWith(">capsule")) }, toast: toast !== null };
    if (!nudge || !card) return { card: null, ...also };
    const box = card.box, pill = placed.find((item) => item.what === "capsule")!.box;
    const buttons = placed.filter((item) => item.what === "button");
    const line = card.id ? marked.get(card.id) : undefined;
    const atItsHeight = text.filter((other) => other.y < box.y + box.h && box.y < other.y + other.h);
    const right = atItsHeight.every((other) => box.x >= other.x + other.w);
    const level = line !== undefined && box.y <= line.y + line.h / 2 && box.y + box.h >= line.y + line.h / 2;
    return {
      card: {
        says: nudge.text,
        steps: nudge.trail,
        look: nudge.leave > 0 ? "going" : nudge.appear < 1 ? "coming up" : "up",
        offers: buttons.map((item) => item.id),
        buttonsInsideTheCard: buttons.every((item) => item.box.x >= box.x && item.box.y >= box.y && item.box.x + item.box.w <= box.x + box.w && item.box.y + item.box.h <= box.y + box.h),
        insideTheDisplay: box.x >= 0 && box.y >= 0 && box.x + box.w <= DISPLAY.w && box.y + box.h <= DISPLAY.h,
        onText: text.some((other) => touches(other, box)),
        onPieces: PIECES.filter((what) => placed.some((item) => item.what === what && touches(item.box, box))),
        where: !line ? (box.x + box.w / 2 > DISPLAY.w / 2 && box.y + box.h <= pill.y ? "no line: at the right, above the capsule" : "no line: elsewhere") : level && right ? "level with its line, right of the text" : right ? "right of the text" : "elsewhere",
        arrowLeadsToIt: placed.some((item) => item.what === "lead" && item.id?.endsWith(">nudge")),
        ...(input.words ? { button: nudge.offer } : {}),
        ...(input.motion ? { appear: places(nudge.appear), rows: nudge.rows.map(places), leave: places(nudge.leave), wordsInInk: nudge.inked } : {}),
      },
      ...also,
    };
  });
}

/** Lines given to the body's own reader of the seam, as the app gets them: what it took each one for, or why it refused it. */
export function seen(input: { lines: object[] }) {
  return execFileSync(headless, ["lines"], { input: input.lines.map((line) => JSON.stringify(line)).join("\n") + "\n", encoding: "utf8" }).split("\n").filter(Boolean);
}

/**
 * Each moment of a hand-written run painted as the app paints it: the overlay with the guide's card left out, and
 * the card in its own window, which a recording leaves out. Whether the guide's card is up, whether the overlay puts
 * any ink on it, whether the card's window draws it, and whether that window draws anything beyond it (the arrow
 * that leads to the card, when one does), past the room its shadow takes.
 */
export function apart(input: { lines: string[]; rows: Written[]; at: number[] }) {
  const dir = handWritten("apart", onTheirLines(input.rows, input.lines), input.lines);
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  const margin = tokens.shadow + tokens.band + 2;
  return input.at.map((moment) => {
    const seen = JSON.parse(execFileSync(headless, ["apart", dir, join(root, "body", "tokens.json"), String(moment), String(margin)], { encoding: "utf8" }));
    if (seen.guide === null) return { guide: null, overlayDrawsSomething: seen.overlayInk > 0 };
    return { guide: "up", overlayInkOnIt: seen.overlayInkOnTheCard > 0, itsWindowDrawsIt: seen.cardInkOnTheCard > 0, itsWindowDrawsMore: seen.cardInkElsewhere > 0 };
  });
}

/** Whether the app would open each address in his browser: an https address on usc.edu or a site under it, and nothing else. */
export function usc(input: { addresses: string[] }) {
  const opens: boolean[] = JSON.parse(execFileSync(headless, ["usc", ...input.addresses], { encoding: "utf8" }));
  return Object.fromEntries(input.addresses.map((address, index) => [address, opens[index]]));
}
