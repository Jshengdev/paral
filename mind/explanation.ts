import type { Asking, Hands } from "./ask.ts";
import type { card } from "./card.ts";
import type { lessonClip } from "./clip.ts";
import { explain, WHOLE, type Planned } from "./cores/beats.ts";
import { unknownDate, worded } from "./cores/dates.ts";
import type { HoldEvent } from "./cores/hold.ts";
import { givesAway } from "./cores/push.ts";
import type { Answered, Part } from "./ports.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/** What an explanation works with: the voice, the board, the clip, the lines said before it, and the lesson's record. */
type With = {
  talk: { speak(beat: number, text: string): void };
  board: ReturnType<typeof card>;
  clip: ReturnType<typeof lessonClip>;
  lead: { count(): number };
  drew(event: HoldEvent): void;
  /** Everything a date may be taken from: his words, the lines on his screen, and the kept pages given with this ask. */
  sources: string[];
};

/**
 * The answer when his work has no wrong line: up to three sentences, each with its mark, and a board. It is acted on
 * while it arrives: the board goes out when it is whole, the first mark ahead of its sentence, and each sentence when
 * it is finished. With a lesson clip coming it is one sentence and no board.
 */
export function explanation({ settings, send, log }: Hands, asking: Asking, { talk, board, clip, lead, drew, sources }: With) {
  const { id, seen } = asking;
  const since = () => Date.now() - asking.releasedAt;
  /** How many of its sentences are out, and whether the first mark went out ahead of its sentence. */
  let told = 0;
  let markOut = false;
  /** Sentences that were not said, since they named a date found on no page paral has read. */
  const held = new Set<string>();

  /** The reply so far as sentences, each with its mark found on his screen. */
  const planned = (reply: { result?: string | null; beats: Answered["beats"] }) =>
    explain({ result: reply.result ?? null, beats: reply.beats }, seen.lines, seen.display, settings.groundMinScore.value, clip.on() ? 1 : settings.maxBeats.value, settings.ringReach.value, clip.on() ? WHOLE : settings.sentenceMaxWords.value);

  const draw = (beat: number, mark: NonNullable<Planned["mark"]>) => {
    send({ v, type: "mark", id, beat, kind: mark.kind, box: mark.box, ...(mark.label ? { label: mark.label } : {}) });
    drew({ type: "mark.drawn", kind: mark.kind, line: mark.line });
  };

  /** Says every sentence not yet said, each with its mark. They are numbered after the lines said before the answer. */
  const tell = (sentences: Planned[]) => {
    for (; told < sentences.length; told++) {
      const { say, mark } = sentences[told];
      const beat = lead.count() + told;
      // Push: a date that is on no page paral has read would be made up, so the sentence that names it is not said.
      const made = unknownDate(say, sources);
      if (made) {
        held.add(say);
        log(`${id}: push held back a sentence that names a date found on no page it has read (${worded(made)}); it was: "${say}"`);
        continue;
      }
      send({ v, type: "say", id, beat, text: say });
      if (mark && !(told === 0 && markOut)) draw(beat, mark);
      talk.speak(beat, say);
      if (told === 0) log(`${id}: first sentence at ${since()} ms from the release`);
    }
  };

  /** The first sentence's mark goes out the moment it is whole, ahead of the sentence. Later marks keep to their sentences. */
  const markAhead = (part: Part) => {
    if (markOut || told > 0 || part.beats.length > 0 || !part.nextMark) return;
    const mark = planned({ beats: [{ say: ".", mark: part.nextMark }] }).at(-1)?.mark;
    if (!mark) return;
    markOut = true;
    draw(lead.count(), mark);
    log(`${id}: the first mark at ${since()} ms from the release, ahead of its sentence`);
  };

  return {
    /** How many of its sentences have been said. */
    told: () => told,
    /** Whether its first mark is on his screen ahead of its sentence. */
    markOut: () => markOut,
    /** Part of the answer has arrived: the board once it is whole, the first mark, and each finished sentence. */
    arriving(part: Part) {
      if (!clip.on()) board.fill(part.board);
      if (part.board === null) board.close("the answer has no board");
      markAhead(part);
      tell(planned(part));
    },
    /**
     * The whole answer is here: the sentences still to say, then the board. An answer that gives his result away is
     * held back whole, with one fixed line in its place and no board or clip. Gives back whether the model's own
     * sentences were said.
     */
    finish(answered: Answered): boolean {
      let sentences = planned(answered);
      const leak = givesAway(sentences, answered.result);
      if (leak) {
        log(`${id}: push held back an explanation that gave the result away; it was: "${sentences.map((beat) => beat.say).join(" ")}"`);
        sentences = [{ say: settings.heldBackLine.value, mark: null }];
        clip.drop();
      }
      tell(sentences);
      board.fill(leak || clip.on() ? null : answered.board);
      board.close("no board came");
      drew({ type: "break.fixed" });
      // A sentence held back for a date is never left out in silence: what is left can sound like the whole answer.
      // He is told that part was left out, or, when every sentence went, that it is on no page paral has read.
      const kept = sentences.filter(({ say }) => !held.has(say)).length;
      if (kept < sentences.length) tell([...sentences, { say: kept === 0 ? settings.noPageLine.value : settings.leftOutLine.value, mark: null }]);
      for (const { say } of sentences) if (!held.has(say)) drew({ type: "line.shown", text: say });
      log(`${id}: ${sentences.length} sentence${sentences.length === 1 ? "" : "s"}, all sent at ${since()} ms from the release`);
      return !leak;
    },
  };
}
