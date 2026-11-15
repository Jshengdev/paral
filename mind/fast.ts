import type { Asking, Hands } from "./ask.ts";
import { unfit } from "./cores/fit.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
const count = (text: string) => text.split(/\s+/).filter(Boolean).length;

type Speaks = { speak(beat: number, text: string): void; quietAt(): number | null };
/** What the fast lines must ask the answer: has any of it been said, is it an explanation with no wrong line, and have its first fields come. */
type Answer = { nothingSaid(): boolean; explains(): boolean; arriving(): boolean; shown(): boolean };

/**
 * The fast lines of one ask, said while the deep answer is worked out. The opener goes out as soon as it is written.
 * If it fails or runs long a fixed line stands in; if it is not there by the deadline the fixed line is said first and
 * the opener follows when it comes, unless the answer has begun. If the wait goes on after that, fixed stall lines. The fast model's line about the page is held until the deep
 * answer says there is no wrong line, and is never said on a page of his own working: only the ladder speaks there.
 */
export function fast({ settings, send, log }: Hands, asking: Asking, talk: Speaks, answer: Answer) {
  const { id, signal } = asking;
  const since = () => Date.now() - asking.releasedAt;
  let seen: string | null = null;
  /** What has been said between the opener and the answer: the line about the page, the stall lines, the short one. */
  let page = false;
  let stalls = 0;
  let short = false;
  const before = () => (page ? 1 : 0) + stalls + (short ? 1 : 0);
  /** Nothing yet; "stopgap" once the fixed line has been said at the deadline; "said" once an opener proper is out. */
  let opener: "none" | "stopgap" | "said" = "none";
  const quiet = () => answer.nothingSaid() && before() === 0 && !signal.aborted;
  /** Every fast line but the one about the page is an aside: said while he waits, and no part of the answer. */
  const say = (beat: number, line: string, aside = true) => {
    send({ v, type: "say", id, beat, text: line, ...(aside ? { aside: true } : {}) });
    talk.speak(beat, line);
  };

  /** Says the line about the page as beat 0, if there is one and the answer has turned out to be an explanation. */
  const aboutThePage = () => {
    // With a board or a mark of the answer already on his screen, the line about the page comes too late to be said.
    if (seen === null || !quiet() || !answer.explains() || answer.shown()) return;
    say(0, seen, false);
    page = true;
    log(`${id}: the fast line about the page at ${since()} ms from the release`);
  };

  // The stall. While nothing of the answer has been said: each time the last line has been heard and nothing new
  // has come for a set time, the next fixed line is said, until they run out. Once the answer's first fields are here
  // its first sentence is close, so from then on only one very short line may be said: it can hold the answer back
  // by no more than its own length.
  const lines = settings.stallLines.value;
  if (asking.opener && settings.stallAfterMs.value > 0) {
    const watch = setInterval(() => {
      if (!answer.nothingSaid() || signal.aborted || short) return clearInterval(watch);
      const heard = talk.quietAt();
      if (opener === "none" || heard === null || Date.now() - heard < settings.stallAfterMs.value) return;
      if (answer.arriving()) {
        // A board or a mark already on his screen is something new to look at: no words are needed.
        if (answer.shown()) return clearInterval(watch);
        say(before(), settings.stallShort.value);
        short = true;
        log(`${id}: the answer's first sentence had not come ${settings.stallAfterMs.value} ms after the last line was heard; the short line is said at ${since()} ms`);
      } else if (stalls < lines.length) {
        say(before(), lines[stalls++]);
        log(`${id}: the answer had not begun ${settings.stallAfterMs.value} ms after the last line was heard; stall line ${stalls} is said at ${since()} ms`);
      }
    }, 100);
    watch.unref();
    signal.addEventListener("abort", () => clearInterval(watch), { once: true });
  }

  // The fast model's time has a long tail. If no opener is out by the deadline, the fixed line is said as beat -2.
  // The model's own opener is still said when it comes, as long as nothing of the answer is out yet.
  if (asking.opener) {
    const late = setTimeout(() => {
      if (opener !== "none" || !quiet()) return;
      opener = "stopgap";
      say(-2, settings.openerFallback.value);
      log(`${id}: no opener ${settings.openerDeadlineMs.value} ms after the release; the fixed line is said at ${since()} ms`);
    }, Math.max(0, asking.releasedAt + settings.openerDeadlineMs.value - Date.now()));
    signal.addEventListener("abort", () => clearTimeout(late), { once: true });
  }

  asking.opener
    ?.then((first) => {
      const wrong = first.line === "" ? "came back empty" : count(first.line) > settings.openerMaxWords.value ? `ran past ${settings.openerMaxWords.value} words` : unfit(first.line);
      const fits = wrong === null;
      if (!fits) log(`${id}: the opener is not said: ${wrong}`);
      if (quiet() && (fits || opener === "none")) {
        opener = "said";
        say(-1, fits ? first.line : settings.openerFallback.value);
        log(`${id}: opener at ${since()} ms from the release`);
      } else if (fits) {
        log(`${id}: the opener came at ${since()} ms, after the answer had begun, and is dropped`);
      }
      return first.seen.then((text) => {
        if (text === null) return log(`${id}: the fast model gave no line about the page`);
        if (settings.surfaceMaxWords.value === 0) return log(`${id}: the fast line about the page is switched off and was not said`);
        if (count(text) > settings.surfaceMaxWords.value) return log(`${id}: the fast line about the page ran to ${count(text)} words and was not said`);
        const wrong = unfit(text);
        if (wrong !== null) return log(`${id}: the fast line about the page is not said: ${wrong}`);
        seen = text;
        aboutThePage();
      });
    })
    .catch((error) => {
      if (signal.aborted) return;
      log(`${id}: the opener failed (${error instanceof Error ? error.message : error})`);
      if (opener !== "none" || !quiet()) return;
      opener = "said";
      say(-1, settings.openerFallback.value);
    });

  return {
    aboutThePage,
    /** How many lines have been said between the opener and the answer; the answer's sentences are numbered after them. */
    count: before,
    /** The line about the page, once it has been said. */
    pageLine: () => (page ? seen : null),
  };
}
