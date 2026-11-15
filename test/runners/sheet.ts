// The runner for rows about a measured sheet found on his screen (`cores/sheet.ts`): how many of its lines matched,
// the scale and the error of the fit, and the box one place of its drawing gets, to a tenth of a point.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { place } from "../../mind/cores/sheet.ts";

const root = join(import.meta.dirname, "..", "..");

export function sheetPlace(input: { sheet: string; spot: string; cases: any[] }) {
  const sheet = JSON.parse(readFileSync(join(root, "sheets", input.sheet), "utf8"));
  const round = (n: number) => Math.round(n * 10) / 10;
  return input.cases.map((found: any) => {
    const placed = place(sheet, found);
    if (placed === null) return null;
    const spot = placed.spots[input.spot].box;
    return { matched: placed.matched.length, scale: round(placed.scale), error: round(placed.error), spot: { x: round(spot.x), y: round(spot.y), w: round(spot.w), h: round(spot.h) } };
  });
}
