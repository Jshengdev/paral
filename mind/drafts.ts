import { fits } from "./cores/catch.ts";
import type { Opened, Opener } from "./ports.ts";
import type { Settings } from "./settings.ts";

type Draft = { words: string; line: Promise<Opened>; at: number };

/**
 * The opener, drafted while he is still talking. The fast model is asked again every so often with his words so
 * far, so that when he lets go a line is already written. `seen` gives the lines on his screen at that moment.
 */
export function drafts(opener: Opener, settings: Settings, seen: () => string[]) {
  /** The newest draft, and the newest one whose line is already written. */
  let newest: Draft | null = null;
  let written: Draft | null = null;

  const ask = (said: string, signal: AbortSignal) => {
    const line = opener.open(said, seen(), signal);
    // A draft may never be used. Whoever does use this line hears its failure there; this keeps an unused one quiet.
    line.catch(() => {});
    return line;
  };

  return {
    /** Forgets every draft: a new hold of the key has begun. */
    reset() {
      newest = null;
      written = null;
    },
    /** His words so far. Starts a new draft when the last is old enough and there are enough words to go on. */
    note(words: string, signal: AbortSignal) {
      const due = newest === null || Date.now() - newest.at >= settings.openerDraftEveryMs.value;
      if (!due || words.split(" ").length < settings.openerDraftWords.value) return;
      const draft: Draft = { words, line: ask(words, signal), at: Date.now() };
      newest = draft;
      // Once its line is written it becomes the newest written draft, unless a later one got there first. A draft
      // that fails is simply never "written"; the ask then waits for a newer one or asks afresh.
      const whenWritten = () => {
        const overtaken = written !== null && written.at > draft.at;
        if (!signal.aborted && !overtaken) written = draft;
      };
      draft.line.then(whenWritten, () => {});
    },
    /**
     * The opener for his final words. A draft already written is used before a newer one still being written,
     * since it can be said at once; a draft is used only if it still fits what he ended up saying. Failing both,
     * the fast model is asked afresh.
     */
    choose(final: string, signal: AbortSignal): Promise<Opened> {
      const usable = (draft: Draft | null) => (draft && fits(draft.words, final, settings.openerDraftShare.value) ? draft.line : null);
      return usable(written) ?? usable(newest) ?? ask(final, signal);
    },
  };
}
