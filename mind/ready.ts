import type { Ports } from "./ports.ts";
import type { Settings } from "./settings.ts";
import { SEAM_VERSION, type FromMind } from "../seam/schema.ts";

/** What the mind tells the body when it connects: every setting the body needs, so the body keeps no copy of its own. */
export function ready(ports: Ports, settings: Settings): FromMind {
  return {
    v: SEAM_VERSION,
    type: "ready",
    mind: "paral",
    holdKey: settings.holdKey.value,
    drawKey: settings.drawKey.value,
    earGraceMs: settings.earGraceMs.value,
    markPad: settings.markPad.value,
    pictureLongEdge: settings.pictureLongEdge.value,
    cropAround: settings.cropAround.value,
    // The body looks without a key only when there is something to look for: kept pages, and a model to ask.
    ...(ports.glancer !== null && ports.pages.length > 0 && settings.lookEveryMs.value > 0 ? { lookEveryMs: settings.lookEveryMs.value } : {}),
    ...(settings.cueCards.value.length > 0 ? { cues: settings.cueCards.value } : {}),
  };
}
