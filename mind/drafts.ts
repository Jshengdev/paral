import { fits } from "./cores/catch.ts";
import { unfit } from "./cores/fit.ts";
import type { Opener } from "./ports.ts";
import type { Settings } from "./settings.ts";

type Draft = { words: string; line: Promise<string>; at: number };
/** A draft's line sent to be shown dim: its words, how many of his words the draft had heard, and when it was sent. */
export type Thought = { text: string; heard: number; at: number };
/** What a hold's drafts tell the turn: a line to show dim, and a line for the log. */
type Tells = { show(thought: Thought): void; log(text: string): void };

/**
 * The quick line, drafted while he is still talking. The fast model is asked again each time more of his words
 * arrive, so that when he lets go a line is already written or nearly so. `seen` gives the lines on his screen at
 * that moment. A written line whose draft heard enough is also sent to be shown dim the moment he lets go (`tells`).
 */
export function drafts(opener: Opener, settings: Settings, seen: () => string[], tells?: Tells) {
  /** Every draft of this hold of the key, oldest first. */
  let made: Draft[] = [];
  /** The lines sent to be shown dim in this hold, oldest first, each with its draft; and whether the hold is over. */
  let sent: (Thought & { draft: Draft })[] = [];
  let hold = 0;
  let over = false;

  const ask = (said: string, stillSpeaking: boolean, signal: AbortSignal) => {
    const line = opener.open(said, seen(), stillSpeaking, signal);
    // A draft may never be used. Whoever does use this line hears its failure there; this keeps an unused one quiet.
    line.catch(() => {});
    return line;
  };

  /**
   * A draft's line is written. It is sent to be shown dim when the hold is still on as far as the mind knows, the
   * draft heard `openerDraftLeast` words or more (below that a line guesses at what he will ask), the line could be
   * said (not empty, not past the quick line's most words, nothing the guard refuses), and no newer draft's line has
   * gone already. The app shows the newest one stamped at or before his finger lifting.
   */
  const written = (draft: Draft, text: string, mine: number) => {
    const heard = draft.words.split(" ").length;
    tells?.log(`a draft that heard ${heard} words was written ${Date.now() - draft.at} ms after it was begun`);
    if (mine !== hold || over || heard < settings.openerDraftLeast.value) return;
    if (text === "" || text.split(/\s+/).filter(Boolean).length > settings.openerMaxWords.value || unfit(text) !== null) return;
    if (sent.some((thought) => thought.draft.at >= draft.at)) return;
    const thought = { text, heard, at: Date.now() };
    sent.push({ ...thought, draft });
    tells?.show(thought);
    tells?.log(`the dim line "${text}" was sent, from a draft that heard ${heard} words`);
  };

  return {
    /** Forgets every draft: a new hold of the key has begun. */
    reset() {
      made = [];
      sent = [];
      over = false;
      hold++;
    },
    /** He has let go, as far as the mind knows: from here no line is sent to be shown dim. */
    heldUp() {
      over = true;
    },
    /** His words so far. Starts a new draft when the last is old enough and there are enough words to go on. */
    note(words: string, signal: AbortSignal) {
      const last = made.at(-1);
      const due = last === undefined || Date.now() - last.at >= settings.openerDraftEveryMs.value;
      // The quick line may name what is on his page, so nothing is drafted before the page's lines are here.
      if (!due || words.split(" ").length < settings.openerDraftWords.value || seen().length === 0) return;
      const draft: Draft = { words, line: ask(words, true, signal), at: Date.now() };
      const mine = hold;
      draft.line.then((text) => written(draft, text.trim(), mine), () => {});
      made.push(draft);
    },
    /**
     * The quick line for his final words. A draft fits when it heard enough of his question (see `fits`), and of
     * the drafts that fit, the first to be written is the one said: an older one may be written already, and one
     * begun after he let go will come too late. With no draft that fits, the fast model is asked afresh.
     *
     * When a line was shown dim (the newest sent at or before `releasedAt`, his finger lifting), what he hears must
     * not be another line of its own: its draft's line is said when that draft fits, and otherwise no line comes
     * from here at all, so the fixed line is said at the deadline and no other draft is used or asked for.
     */
    choose(final: string, signal: AbortSignal, releasedAt = Infinity): Promise<string> {
      over = true;
      const enough = { share: settings.openerDraftShare.value, least: settings.openerDraftLeast.value, small: settings.openerSmallWords.value };
      const shown = sent.filter((thought) => thought.at <= releasedAt).at(-1);
      if (shown) {
        const said = fits(shown.draft.words, final, enough);
        tells?.log(`the dim line "${shown.text}" ${said ? "is the line said: its draft fits his final words" : "is not said: its draft heard too little of his final words, so the fixed line is said and no other draft is used"}`);
        return said ? Promise.resolve(shown.text) : new Promise<string>(() => {});
      }
      const fitting = made.filter((draft) => fits(draft.words, final, enough));
      if (fitting.length === 0) return ask(final, false, signal);
      return Promise.any(fitting.map((draft) => draft.line)).catch(() => ask(final, false, signal));
    },
    /**
     * The quick line of one ask: a fixed line while a wrong line of his is open, otherwise the drafted one. With a
     * wrong line open a model that sees his page could name the mistake a rung early, so the line is fixed.
     */
    line(wrongLineOpen: boolean, final: string, signal: AbortSignal, releasedAt = Infinity): Promise<string> {
      return wrongLineOpen ? Promise.resolve(settings.openerInLesson.value) : this.choose(final, signal, releasedAt);
    },
  };
}
