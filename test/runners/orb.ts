// The runner for rows about the orb the pill shuts into at rest (`OrbLight.swift`, `PainterOrb.swift`): its light,
// worked out alone through the scene's clocks, and its place and its waking into the pill in a hand-written run.
// No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handWritten, type Written } from "./body.ts";
import { at, DISPLAY } from "./placed.ts";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const round = (value: number) => Math.round(value * 2) / 2;

/**
 * The orb's light `side` pixels square at each of the given seconds (`paral-headless orb`), with motion reduced when
 * `still`: what share of its square is lit, whether its corners are clear, the colour at its middle, how many colours
 * its solid pixels have, and what share of its pixels differ from the first second's. What a frame costs is not
 * kept here: it depends on the machine (`notes/2026-11-15.md` says what it was).
 */
export function orbLight(input: { side: number; seconds: number[]; still?: boolean }) {
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  const file = fresh("orb") + ".json";
  writeFileSync(file, JSON.stringify({ ...tokens, motion: { ...tokens.motion, reduce: input.still === true } }));
  const made = JSON.parse(execFileSync(headless, ["orb", file, String(input.side), "1", fresh("orb") + ".png", ...input.seconds.map(String)], { encoding: "utf8" }));
  return made.frames.map(({ msPerFrame: _, ...frame }: Record<string, unknown>) => frame);
}

/**
 * At each moment of a hand-written run: the capsule's look; whether the orb's square of light is drawn, its size,
 * and whether it is at the display's middle with the blob's foot `capsule.bottom` above the floor; and the pill's own
 * size, which grows out of the orb's blob as the pill opens.
 */
export function orbWakes(input: { rows: Written[]; at: number[] }) {
  const tokens = JSON.parse(readFileSync(join(root, "body", "tokens.json"), "utf8"));
  const blob = tokens.orb.size * tokens.orb.blob;
  return at(handWritten("orb-wakes", input.rows), input.at).map(({ placed, capsule }) => {
    const orb = placed.find((item) => item.what === "orb")?.box;
    const pill = placed.find((item) => item.what === "capsule")!.box;
    const middle = orb && round(orb.x + orb.w / 2) === DISPLAY.w / 2;
    const foot = orb && round(DISPLAY.h - (orb.y + orb.h / 2 + blob / 2));
    return {
      look: capsule.look,
      orb: orb ? `${round(orb.w)}x${round(orb.h)}${middle ? ", at the display's middle" : ""}, its blob's foot ${foot} above the floor` : null,
      pill: `${round(pill.w)}x${round(pill.h)}`,
    };
  });
}
