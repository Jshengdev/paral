import type { Asking, Hands } from "./ask.ts";
import type { HoldEvent } from "./cores/hold.ts";
import { pick, type Example } from "./cores/lesson.ts";
import type { Clip } from "./ports.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/**
 * The lesson clip of one ask. The model only names a lesson. The example is picked here, on other numbers than his,
 * and its clip is started at once, so it is ready by the time the words are out. If it cannot be made, the answer
 * stays words only and the log says why.
 */
export function lessonClip({ ports, settings, send, log }: Hands, asking: Asking, drew: (event: HoldEvent) => void) {
  const { id, signal } = asking;
  const since = () => Date.now() - asking.releasedAt;
  const known: Record<string, { idea: string; examples: Example[] }> = ports.lessons === null ? {} : settings.lessons.value;
  const lines = asking.seen.lines.map((line) => line.text);
  let showing: { name: string; making: Promise<Clip> } | null = null;
  return {
    /** The lessons the model may name, each with the idea it shows. */
    catalogue: Object.entries(known).map(([name, lesson]) => ({ name, idea: lesson.idea })),
    /** Whether this answer will show a clip. Then it is one sentence, with no board and no fixed line before it. */
    on: () => showing !== null,
    /** Starts the clip for the lesson the model named, when there is an example of it that may be shown. */
    start(name: string | null | undefined, result: string | null) {
      if (!name) return;
      const example = ports.lessons && known[name] ? pick(known[name].examples, lines, result) : null;
      if (!ports.lessons || !example) return log(`${id}: the model named the lesson "${name}", and there is no example of it that may be shown; words only`);
      const making = ports.lessons.render(name, example, signal);
      // show() waits for this and logs a failure; this keeps it quiet if the ask is cut before show() runs.
      making.catch(() => {});
      showing = { name, making };
    },
    /** Drops the clip: the answer gave something away and is being replaced. */
    drop() {
      showing = null;
    },
    /** After the words, the clip. Gives back whether it went out. */
    async show(): Promise<boolean> {
      if (!showing) return false;
      const { name, making } = showing;
      try {
        const made = await making;
        if (signal.aborted) return false;
        send({ v, type: "clip", id, name, ...made });
        drew({ type: "clip.drawn", name });
        log(`${id}: the ${name} clip went out at ${since()} ms from the release`);
        return true;
      } catch (error) {
        if (!signal.aborted) log(`${id}: the ${name} clip could not be made (${error instanceof Error ? error.message : error}); the answer stays words only`);
        return false;
      }
    },
  };
}
