import type { Asking, Hands } from "./ask.ts";
import { boxes } from "./cores/beats.ts";
import { asksFor } from "./cores/catch.ts";
import type { HoldEvent } from "./cores/hold.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/**
 * The board of one ask. When his own words ask for a drawing, an empty card opens at once, before any model has
 * spoken, and the board fills it when it arrives; if no board comes the card is taken away. Without such words the
 * board simply goes out the moment it is whole. A board with rows is sent once.
 */
export function card({ settings, send, log }: Hands, asking: Asking, drew: (event: HoldEvent) => void) {
  const { id, signal } = asking;
  const since = () => Date.now() - asking.releasedAt;
  let open = false;
  let filled = false;
  // With a wrong line already open the answer will be a hint, and a hint has no board: no card is opened.
  if (asking.lesson.breakLine === null && asksFor(asking.words, settings.drawingAsks.value)) {
    open = true;
    send({ v, type: "board", id, rows: [] });
    log(`${id}: he asked for a drawing, so an empty card opens at ${since()} ms from the release`);
  }
  return {
    /** Whether a board with its rows is on his screen. An empty card does not count. */
    filled: () => filled,
    /** Sends the board the moment it is whole; it fills the card when one is open. `shape` says it is not rows joined across. */
    fill(written: string[][] | null | undefined, shape?: "column") {
      const rows = boxes(written ?? []);
      if (rows.length === 0 || filled) return;
      filled = true;
      open = false;
      send({ v, type: "board", id, rows, ...(shape ? { shape } : {}) });
      drew({ type: "board.drawn", rows });
      log(`${id}: the board${shape ? `, a ${shape} of ${rows.length}` : ""} at ${since()} ms from the release`);
    },
    /**
     * A board that grows with its answer: all its rows, and the beats of the rows that have a sentence so far. It is
     * sent again with one more beat as each sentence is said; the app draws a row when its sentence begins.
     */
    grow(rows: string[][], beats: number[]) {
      if (rows.length === 0 || beats.length === 0) return;
      if (!filled) log(`${id}: the board's first row goes with its sentence at ${since()} ms from the release; it has ${rows.length} rows to grow to`);
      filled = true;
      open = false;
      send({ v, type: "board", id, rows, beats });
    },
    /** Takes an empty card away, since no board is coming. */
    close(why: string) {
      if (!open || signal.aborted) return;
      open = false;
      send({ v, type: "board.close", id });
      log(`${id}: the empty card is taken away (${why})`);
    },
  };
}
