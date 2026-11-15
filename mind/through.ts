import type { Asking, Hands } from "./ask.ts";
import { hint } from "./cores/beats.ts";
import type { HoldEvent } from "./cores/hold.ts";
import { givesAway } from "./cores/push.ts";
import { stepsBoard } from "./cores/through.ts";
import type { Answered } from "./ports.ts";
import type { spotsOn } from "./spots.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/** What a step works with: the voice, the lines said before it, the drawing's places, the lesson's record and the steps given so far. */
type With = {
  talk: { speak(beat: number, text: string): void };
  lead: { count(): number };
  spots: ReturnType<typeof spotsOn>;
  drew(event: HoldEvent): void;
  given(): string[];
};

/**
 * The answer when the switch is on and he asked to have the exercise worked through (`cores/through.ts`): exactly the
 * next step of its working, in one or two sentences, with rings on the places of the drawing it is about and a board
 * of every step given so far, the new one last. Nothing drawn for the earlier steps is taken away, so the working
 * builds up on his screen. Only the last step may say what the working gives: a step before it that does is held back.
 */
export function workedThrough({ settings, send, log }: Hands, asking: Asking, { talk, lead, spots, drew, given }: With) {
  const { id } = asking;
  const since = () => Date.now() - asking.releasedAt;
  let told = 0;
  let came = false;

  const say = (text: string) => {
    const beat = lead.count() + told++;
    send({ v, type: "say", id, beat, text });
    talk.speak(beat, text);
    drew({ type: "line.shown", text });
  };

  return {
    /** How many of its lines have been said, and whether the model's step has come. */
    told: () => told,
    came: () => came,
    /** The working was finished by an earlier step: he is told so, with no model asked, and nothing on his screen changes. */
    done() {
      came = true;
      say(settings.workThroughDoneLine.value);
      log(`${id}: he asked for another step after the last one; the done line is said and no model is asked`);
    },
    /** The step is here: its sentences, then its rings and the board, unless it gave the result away too soon. */
    finish(answered: Answered) {
      came = true;
      const before = given();
      const step = answered.walk ?? { step: `Step ${before.length + 1}`, last: false };
      const sentences = hint(answered, 2, settings.sentenceMaxWords.value);
      if (!step.last && givesAway([...sentences, step.step].map((text) => ({ say: text, mark: null })), answered.result)) {
        log(`${id}: push held back step ${before.length + 1}, which said what the working gives before its last step; it was: "${sentences.join(" ")}" (${step.step})`);
        return say(settings.workThroughHeldLine.value);
      }
      const first = lead.count() + told;
      for (const text of sentences) say(text);
      spots.ring(answered.spots ?? [], first, drew, settings.workThroughSpotsMost.value);
      const board = stepsBoard([...before, step.step]);
      send({ v, type: "board", id, ...board });
      drew({ type: "board.drawn", rows: board.rows });
      drew({ type: "step.given", step: step.step, last: step.last });
      log(`${id}: step ${before.length + 1} of the working${step.last ? ", the last, which says what it gives" : ""}: "${step.step}", at ${since()} ms from the release`);
    },
  };
}
