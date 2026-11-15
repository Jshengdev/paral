import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let made = 0;

/** A path under the temp folder that no other row of this run has used. */
export const fresh = (what: string) => join(tmpdir(), `paral-${what}-${process.pid}-${++made}`);

/**
 * Where every row's mind writes the files it makes for him (the calendar file, the notes page, its cut-outs): a
 * folder of this run's own, never the Mac's temporary folder itself, where his running app keeps the real ones
 * under the same names (`mind/outbox.ts`).
 */
export const out = join(tmpdir(), `paral-out-${process.pid}`);
mkdirSync(out, { recursive: true });
process.env.PARAL_OUT = out;
