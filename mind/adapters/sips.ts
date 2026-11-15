import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scaled } from "../cores/sitting.ts";
import type { Cutter } from "../ports.ts";

const run = promisify(execFile);

/**
 * The live cutting port: macOS's own `sips`, so the mind needs no image library. The saved copy of a look is smaller
 * than the picture its lines were read at, so its size is asked first and the part scaled to it (`scaled`). Nothing
 * leaves the Mac. A picture that cannot be read or cut gives false, and the step's picture is left out.
 */
export function sips(log: (line: string) => void): Cutter {
  return {
    async cut({ from, read, part, to }) {
      try {
        const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", from]);
        const w = Number(/pixelWidth:\s*(\d+)/.exec(stdout)?.[1]), h = Number(/pixelHeight:\s*(\d+)/.exec(stdout)?.[1]);
        if (!(w > 0 && h > 0)) throw new Error(`sips gave no size for ${from}`);
        const inCopy = scaled(part, read, { w, h });
        if (inCopy === null) throw new Error("the part is not on the saved picture");
        await run("sips", ["-c", String(inCopy.h), String(inCopy.w), "--cropOffset", String(inCopy.y), String(inCopy.x), from, "--out", to]);
        return true;
      } catch (error) {
        log(`a section could not be cut from the look's picture (${error instanceof Error ? error.message : error}); the notes leave its picture out`);
        return false;
      }
    },
  };
}
