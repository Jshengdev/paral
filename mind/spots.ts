import type { Hands, Screen } from "./ask.ts";
import { toPoints } from "./cores/ground.ts";
import type { HoldEvent } from "./cores/hold.ts";
import { place, type Anchors, type Placed } from "./cores/sheet.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
/** What a model may have ringed: the atoms and bonds of a drawing. Not the signs between them, and never the space the result goes in. */
const ringable = (name: string) => !["plus", "arrow", "space"].includes(name);

/**
 * The named places of a measured drawing, for one ask. A sheet is found on his screen from its own printed lines
 * (`cores/sheet.ts`), which gives every place of its drawing a box with no model pointing at the picture. The model is
 * told the places' names and may name those its sentences speak of; `ring` rings them. With no sheet on his screen
 * there are no names and nothing is ringed.
 */
export function spotsOn({ ports, settings, send, log }: Hands, id: string, seen: Screen) {
  let on: { sheet: Anchors; placed: Placed } | null = null;
  for (const sheet of ports.sheets) {
    const placed = place(sheet, seen.lines);
    if (placed !== null) on = on ?? { sheet, placed };
  }
  const named = on === null ? [] : Object.entries(on.sheet.spots).filter(([name]) => ringable(name)).map(([name, spot]) => ({ name, what: spot.what ?? name }));
  if (on !== null) log(`${id}: his screen holds the measured sheet "${on.sheet.name ?? "unnamed"}": ${on.placed.matched.length} of its lines were found and the fit misses by ${on.placed.error.toFixed(1)} px; the model may have ${named.length} places of its drawing ringed`);

  return {
    named,
    /** Rings the places the answer named, with the sentence numbered `beat`: two at most, and only places the sheet has. */
    ring(names: string[], beat: number, drew: (event: HoldEvent) => void) {
      if (on === null) return;
      for (const name of [...new Set(names)].filter(ringable).slice(0, settings.spotsMost.value)) {
        const spot = on.placed.spots[name];
        if (spot === undefined) {
          log(`${id}: the answer named a place the drawing does not have ("${name}"); nothing is ringed for it`);
          continue;
        }
        const what = on.sheet.spots[name].what ?? name;
        send({ v, type: "mark", id, beat, kind: "ring", box: toPoints(spot.box, seen.display) });
        drew({ type: "mark.drawn", kind: "ring", line: `the drawing's ${what}` });
        log(`${id}: a ring on the drawing's ${name} (${what})`);
      }
    },
  };
}
