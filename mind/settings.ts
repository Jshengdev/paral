import { brain } from "./settings/brain.ts";
import { cues } from "./settings/cues.ts";
import { ear } from "./settings/ear.ts";
import { notes } from "./settings/notes.ts";
import { opener } from "./settings/opener.ts";
import { pages } from "./settings/pages.ts";
import { teach } from "./settings/teach.ts";
import { through } from "./settings/through.ts";
import { voice } from "./settings/voice.ts";
import { wire } from "./settings/wire.ts";

export type { Rung, Setting } from "./settings/types.ts";

/**
 * Every value paral runs on, in one object. Each lives in settings/, in the file for what it governs, with why it has
 * that value and what was measured.
 */
export const settings = { ...wire, ...ear, ...voice, ...opener, ...teach, ...through, ...brain, ...pages, ...cues, ...notes };

export type Settings = typeof settings;
