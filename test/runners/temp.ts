import { tmpdir } from "node:os";
import { join } from "node:path";

let made = 0;

/** A path under the temp folder that no other row of this run has used. */
export const fresh = (what: string) => join(tmpdir(), `paral-${what}-${process.pid}-${++made}`);
