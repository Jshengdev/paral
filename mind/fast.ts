import type { Asking, Hands } from "./ask.ts";
import { unfit } from "./cores/fit.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
const count = (text: string) => text.split(/\s+/).filter(Boolean).length;
const why = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Speaks = { speak(beat: number, text: string): void; quietAt(): number | null };
/** What the fast lines must ask the answer: has any of it been said, have its first fields come, is any of it on his screen. */
type Answer = { nothingSaid(): boolean; arriving(): boolean; shown(): boolean };

/**
 * The lines said while the deep answer is worked out. First the quick line: one short line from the fast model, said
 * as he lets go, which may name the thing on his page that matters. The deep model is told that line word for word,
 * so the answer is asked once it is settled. If the quick line is not written by the deadline, a fixed line is said
 * first, so that he hears something inside a second, and the quick line follows it if it comes before the wait runs
 * out; one that comes later still is never said, since the deep model was not told it. A line that fails, runs long
 * or is not fit to say is replaced by the fixed line. After that, if the wait goes on, fixed stall lines.
 */
export function fast({ settings, send, log }: Hands, asking: Asking, talk: Speaks, answer: Answer) {
  const { id, signal } = asking;
  const since = () => Date.now() - asking.releasedAt;
  /** What has been said after the quick line and before the answer: the stall lines, and the short one. */
  let stalls = 0;
  let short = false;
  const before = () => stalls + (short ? 1 : 0);
  let openerOut = false;
  /** Every fast line is an aside: said while he waits, and no part of the answer. */
  const say = (beat: number, line: string) => {
    send({ v, type: "say", id, beat, text: line, aside: true });
    talk.speak(beat, line);
    openerOut = true;
  };

  /** Says the quick line, or the fixed line in its place, and gives back what was said. Null with no fast model, or once he has pressed again. */
  async function open(): Promise<string | null> {
    if (!asking.opener) return null;
    const fixed = settings.openerFallback.value;
    const written = asking.opener.then(
      (line) => ({ line }),
      (error) => ({ failed: why(error) }),
    );
    /** The quick line if it is written by `ms` after the release, or "late". */
    const by = async (ms: number) => {
      let timer: NodeJS.Timeout | undefined;
      const late = new Promise<"late">((resolve) => (timer = setTimeout(() => resolve("late"), Math.max(0, asking.releasedAt + ms - Date.now()))));
      const first = await Promise.race([written, late]);
      clearTimeout(timer);
      return first;
    };
    let first = await by(settings.openerDeadlineMs.value);
    if (signal.aborted) return null;
    const stoodIn = first === "late";
    if (first === "late") {
      say(-2, fixed);
      log(`${id}: no opener ${settings.openerDeadlineMs.value} ms after the release; the fixed line is said at ${since()} ms`);
      first = await by(settings.openerWaitMs.value);
      if (signal.aborted) return null;
      if (first === "late") {
        log(`${id}: no opener ${settings.openerWaitMs.value} ms after the release either; the answer is asked without it, and it is not said if it comes`);
        return fixed;
      }
    }
    const wrong = "failed" in first ? null : first.line === "" ? "came back empty" : count(first.line) > settings.openerMaxWords.value ? `ran past ${settings.openerMaxWords.value} words` : unfit(first.line);
    if ("failed" in first) log(`${id}: the opener failed (${first.failed})`);
    else if (wrong !== null) log(`${id}: the opener is not said: ${wrong}`);
    const fit = !("failed" in first) && wrong === null;
    // A line that cannot be said is replaced by the fixed line, unless the fixed line has already stood in.
    if (!fit && stoodIn) return fixed;
    const line = fit && !("failed" in first) ? first.line : fixed;
    say(-1, line);
    log(`${id}: opener at ${since()} ms from the release`);
    return line;
  }

  // The stall. While nothing of the answer has been said: each time the last line has been heard and nothing new
  // has come for a set time, the next fixed line is said, until they run out. Once the answer's first fields are here
  // its first sentence is close, so from then on only one very short line may be said: it can hold the answer back
  // by no more than its own length.
  const lines = settings.stallLines.value;
  if (asking.opener && settings.stallAfterMs.value > 0) {
    const watch = setInterval(() => {
      if (!answer.nothingSaid() || signal.aborted || short) return clearInterval(watch);
      const heard = talk.quietAt();
      if (!openerOut || heard === null || Date.now() - heard < settings.stallAfterMs.value) return;
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

  return {
    /** The quick line that was said, once it is settled: the deep model is told it. */
    opened: open(),
    /** How many lines have been said between the quick line and the answer; the answer's sentences are numbered after them. */
    count: before,
  };
}
