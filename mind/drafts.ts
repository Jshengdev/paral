import { fits } from "./cores/catch.ts";
import type { Opener } from "./ports.ts";
import type { Settings } from "./settings.ts";

type Draft = { words: string; line: Promise<string>; at: number };

/**
 * The quick line, drafted while he is still talking. The fast model is asked again each time more of his words
 * arrive, so that when he lets go a line is already written or nearly so. `seen` gives the lines on his screen at
 * that moment.
 */
export function drafts(opener: Opener, settings: Settings, seen: () => string[]) {
  /** Every draft of this hold of the key, oldest first. */
  let made: Draft[] = [];

  const ask = (said: string, stillSpeaking: boolean, signal: AbortSignal) => {
    const line = opener.open(said, seen(), stillSpeaking, signal);
    // A draft may never be used. Whoever does use this line hears its failure there; this keeps an unused one quiet.
    line.catch(() => {});
    return line;
  };

  return {
    /** Forgets every draft: a new hold of the key has begun. */
    reset() {
      made = [];
    },
    /** His words so far. Starts a new draft when the last is old enough and there are enough words to go on. */
    note(words: string, signal: AbortSignal) {
      const last = made.at(-1);
      const due = last === undefined || Date.now() - last.at >= settings.openerDraftEveryMs.value;
      // The quick line may name what is on his page, so nothing is drafted before the page's lines are here.
      if (!due || words.split(" ").length < settings.openerDraftWords.value || seen().length === 0) return;
      made.push({ words, line: ask(words, true, signal), at: Date.now() });
    },
    /**
     * The quick line for his final words. A draft fits when it heard enough of his question (see `fits`), and of
     * the drafts that fit, the first to be written is the one said: an older one may be written already, and one
     * begun after he let go will come too late. With no draft that fits, the fast model is asked afresh.
     */
    choose(final: string, signal: AbortSignal): Promise<string> {
      const enough = { share: settings.openerDraftShare.value, least: settings.openerDraftLeast.value, small: settings.openerSmallWords.value };
      const fitting = made.filter((draft) => fits(draft.words, final, enough));
      if (fitting.length === 0) return ask(final, false, signal);
      return Promise.any(fitting.map((draft) => draft.line)).catch(() => ask(final, false, signal));
    },
  };
}
