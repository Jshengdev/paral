// The runner for rows about the voice pill and the bubble above it: moments of a hand-written run, through the real
// scene and painter, with a Dock as tall as the row says. No mind, no service, no window.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { at, DISPLAY, textOf, type Box } from "./placed.ts";

const touches = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const round = (value: number) => Math.round(value * 2) / 2;

/**
 * A row writes a mic or voice line by its loudness: `amp` is the height of a square wave and `ms` how long it lasts,
 * at the microphone's 16 kHz or the voice's 24 kHz. Here it becomes that sound.
 */
function sounded(rows: Written[]): Written[] {
  return rows.map((row) => {
    const { amp, ms, ...line } = row.line as Record<string, unknown>;
    if (typeof amp !== "number" || typeof ms !== "number") return row;
    const samples = ms * (line.type === "mic" ? 16 : 24);
    const pcm = Buffer.alloc(samples * 2);
    for (let i = 0; i < samples; i++) pcm.writeInt16LE(i % 2 ? amp : -amp, i * 2);
    return { at: row.at, line: { ...line, pcm: pcm.toString("base64") } };
  });
}

/**
 * At each moment, only what `watch` names: the capsule's look; the pill's size (at rest, the orb's blob, and whether
 * the cross is beside it); how far its foot stands above the Dock's top; its middle across the display; the bubble (what it says,
 * which of its words are in stone, whether its caret is up, how far above the pill it is, and whether it lies on the
 * page's read text, as the pill does, and the trail it carries); whether the logo mark by the pill breathes to say
 * paral is working; the wave's marks, newest last, with its colour; and which of the other pieces up (the way
 * arrow, the toast, the board, the cards) lie in the pill's band at the foot, and which are up at all.
 */
export function pill(input: { lines?: string[]; rows: Written[]; at: number[]; dock?: number; watch: string[] }) {
  const dir = handWritten("pill", sounded(input.rows), input.lines);
  // The page's read lines: the drawn page's, or those of a look the row writes first.
  const text = input.lines || input.rows[0]?.line.type === "look" ? textOf(dir) : [];
  const dock = input.dock ?? 0;
  // The pill's band at the foot: from the top of the room its bubble may take down to the Dock, the display's width.
  const tokens = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "body", "tokens.json"), "utf8"));
  const { capsule: k, bubble: b, orb: o } = tokens;
  const top = DISPLAY.h - dock - k.bottom - k.height - b.gap - (2 * k.type * b.leading + 2 * b.padY);
  const band: Box = { x: 0, y: top, w: DISPLAY.w, h: DISPLAY.h - dock - top };
  const own = ["capsule", "cross", "orb", "bubble", "pointer", "tag", "lead", "mark", "echo", "pulse", "trail"];
  return at(dir, input.at, false, dock).map(({ placed, capsule }) => {
    const cross = placed.find((item) => item.what === "cross")?.box;
    const light = placed.find((item) => item.what === "orb")?.box;
    // At rest the pill is shut into the orb: its blob, the middle of the orb's square of light, is what is measured.
    const across = light ? light.w * o.blob : 0;
    const blob: Box | undefined = light && capsule.look === "rest" ? { x: light.x + (light.w - across) / 2, y: light.y + (light.h - across) / 2, w: across, h: across } : undefined;
    const box = blob ?? placed.find((item) => item.what === "capsule")!.box;
    const bubble = placed.find((item) => item.what === "bubble")?.box;
    const all: Record<string, unknown> = {
      look: capsule.look,
      pill: blob ? `the orb, ${round(blob.w)}x${round(blob.h)}${cross ? ", and the cross beside it" : ""}` : `${round(box.w)}x${round(box.h)}`,
      foot: round(DISPLAY.h - dock - (box.y + box.h)),
      middle: round(box.x + box.w / 2) === DISPLAY.w / 2 ? "the display's middle" : round(box.x + box.w / 2),
      onText: text.some((line) => touches(line, box)),
      bubble: bubble
        ? { says: capsule.says || capsule.note, stone: capsule.stone, caret: capsule.caret, aboveThePill: round(box.y - (bubble.y + bubble.h)), onText: text.some((line) => touches(line, bubble)), ...(capsule.trail.length ? { trail: capsule.trail } : {}) }
        : null,
      working: capsule.working ? "the logo mark by the pill breathes" : null,
      inTheBand: placed.filter((item) => !own.includes(item.what) && touches(item.box, band)).map((item) => item.what),
      upElsewhere: placed.filter((item) => !own.includes(item.what)).map((item) => item.what),
      wave: capsule.wave.length === 0 ? "still dots" : `${capsule.look === "listening" ? "ink" : "stone"}: ${capsule.wave.slice(-9).join(" ")}`,
    };
    return Object.fromEntries(input.watch.map((name) => [name, all[name]]));
  });
}
