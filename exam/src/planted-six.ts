import { COLUMN_CASES } from "./planted-column.ts";
import { DRAG_CASES } from "./planted-drag.ts";
import { LABEL_CASES } from "./planted-label.ts";
import { NOTES_CASES } from "./planted-notes.ts";
import { THOUGHT_CASES } from "./planted-thought.ts";
import { WRITTEN_CASES } from "./planted-written.ts";

// The planted cases of the six bars made his by his click of 2026-11-15, 18:47 (C24 to C29), each in the file named
// after its bar (the sixth, the dim line, in planted-thought.ts). One list, so the judge's own test names them once.
export const SIX_CASES = [...LABEL_CASES, ...COLUMN_CASES, ...WRITTEN_CASES, ...NOTES_CASES, ...DRAG_CASES, ...THOUGHT_CASES];
