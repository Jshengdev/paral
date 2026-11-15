import type { Asking, Hands } from "./ask.ts";
import type { lessonClip } from "./clip.ts";
import { fitted, hint, WHOLE } from "./cores/beats.ts";
import type { Found } from "./cores/ground.ts";
import type { HoldEvent } from "./cores/hold.ts";
import { judge } from "./cores/push.ts";
import type { Answered } from "./ports.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/** What a hint works with: the voice, the clip, the lines said before it, and the lesson's record. */
type With = {
  talk: { speak(beat: number, text: string): void };
  clip: ReturnType<typeof lessonClip>;
  lead: { count(): number };
  drew(event: HoldEvent): void;
};

/**
 * The answer when his own work has a wrong line: a ring on that line, the rung's fixed line said with the ring, then
 * the model's hint once Push has passed it. One rung of the ladder per ask, and never his result.
 */
export function ladderHint({ ports, settings, send, log }: Hands, asking: Asking, { talk, clip, lead, drew }: With) {
  const { id, seen, signal } = asking;
  const ladder = settings.ladder.value;
  const since = () => Date.now() - asking.releasedAt;
  /** How many of its lines are out, and whether the rung's fixed line was said with the ring. */
  let told = 0;
  let led = false;

  const say = (beat: number, text: string, rung: number) => {
    send({ v, type: "say", id, beat, text, rung, of: ladder.length });
    talk.speak(beat, text);
  };

  return {
    /** How many of its lines have been said. */
    told: () => told,
    /**
     * The wrong line is found on his screen: ring it and say the rung's fixed line with the ring. The line is said
     * every time, heard before or not: the ring is a new stage and gets its line, so the wait for the hint is never
     * silent. With a lesson clip coming there is no fixed line; the one sentence leads to the clip.
     */
    ring(place: Extract<Found, { found: true }>, rung: number) {
      const kind = fitted("ring", place.line, seen.lines, settings.ringReach.value, seen.display.scale);
      send({ v, type: "mark", id, beat: lead.count(), kind, box: place.box });
      drew({ type: "mark.drawn", kind, line: place.line });
      if (clip.on()) return;
      say(lead.count(), ladder[rung].safe, rung);
      told = 1;
      led = true;
    },
    /**
     * The whole answer is here: the hint is cut to the rung's length and judged. A hint that gives his result away,
     * or says a sum that does not add up, is swapped for the rung's fixed line; when that line was already said with
     * the ring, nothing more is said.
     */
    async finish(answered: Answered, place: Found, rung: number) {
      const { safe } = ladder[rung];
      const sentences = hint(answered, clip.on() ? 1 : ladder[rung].sentences, clip.on() ? WHOLE : settings.sentenceMaxWords.value);
      const line = sentences.join(" ");
      // Numbers that stand on his own wrong line may be spoken of; any other number of his result may not.
      const onHisLine = [answered.breakLine, place.found ? place.line : "", asking.lesson.breakRead ?? ""].join(" ");
      const judged = { line, result: answered.result, safe, onHisLine };
      // Code judges first. The second look is asked only about a hint code has not ruled out; if it cannot answer,
      // the hint counts as a leak, since the rung's fixed line is the safe thing to say when a hint cannot be checked.
      let verdict = judge({ ...judged, secondLook: null });
      if (verdict.verdict === "show") {
        const leaks = await ports.secondLook.leaks(line, answered.problem, signal).catch((error) => {
          if (!signal.aborted) log(`${id}: the second look failed (${error instanceof Error ? error.message : error}); the hint is treated as a leak`);
          return true;
        });
        if (signal.aborted) return;
        verdict = judge({ ...judged, secondLook: leaks });
      }
      const swapped = verdict.verdict !== "show";
      if (verdict.verdict !== "show") {
        const what = verdict.verdict === "leak" ? "a leaked hint" : "a hint with a wrong sum";
        log(`${id}: push swapped ${what} for the safe line of rung ${rung} (${verdict.why}); the hint it replaced was: "${line}"`);
        clip.drop();
      }
      const shown = !swapped ? sentences : led ? [] : [safe];
      const from = led ? 1 : 0;
      shown.forEach((text, index) => say(lead.count() + from + index, index === 0 && !place.found ? `${settings.notFoundLine.value} ${text}` : text, rung));
      told = from + shown.length;
      if (led) drew({ type: "line.shown", text: safe });
      // This road is only taken with a wrong line named, so breakLine is there.
      drew({ type: "break.found", line: answered.breakLine!, read: place.found ? place.line : null });
      drew({ type: "rung.given", rung });
      for (const text of shown) drew({ type: "line.shown", text });
      log(`${id}: rung ${rung}; hint at ${since()} ms from the release${verdict.verdict === "leak" ? "; LEAK CAUGHT" : verdict.verdict === "wrong" ? "; WRONG SUM CAUGHT" : ""}`);
    },
  };
}
