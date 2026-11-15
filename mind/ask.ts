import { card } from "./card.ts";
import { lessonClip } from "./clip.ts";
import { wipes } from "./cores/beats.ts";
import { alike, locate, type Found } from "./cores/ground.ts";
import { happened } from "./cores/happened.ts";
import type { Noted } from "./cores/guide.ts";
import { together, whichPage } from "./cores/page.ts";
import { fold, type HoldEvent, type Lesson } from "./cores/hold.ts";
import { next, type Move } from "./cores/teach.ts";
import { explanation } from "./explanation.ts";
import type { Ahead } from "./glance.ts";
import { fast } from "./fast.ts";
import { ladderHint } from "./hint.ts";
import type { Answered, Part, Ports } from "./ports.ts";
import type { Settings } from "./settings.ts";
import { speech } from "./speech.ts";
import { SEAM_VERSION, type FromBody, type FromMind } from "../seam/schema.ts";

export type Screen = Extract<FromBody, { type: "screen" }>;
/** `noted` tells the demo's guide that something it waits for was seen to happen; absent where there is no guide. */
export type Hands = { ports: Ports; settings: Settings; send: (line: FromMind) => void; log: (line: string) => void; noted?: (what: Noted) => void };
export type Asking = { id: string; words: string; seen: Screen; circled: number[]; lesson: Lesson; ahead: Ahead[]; markUp: boolean; releasedAt: number; opener: Promise<string> | null; signal: AbortSignal };

const v = SEAM_VERSION;

/**
 * One ask, from his final words to the last sound sent. The answer is acted on while it is still arriving. Its first
 * fields say which of two roads it takes: a hint, when his own work has a wrong line (`hint.ts`), or an explanation,
 * when it has none (`explanation.ts`).
 * `keep` is called when what he was shown is settled: once for the words and marks, and again if a clip follows them.
 */
export async function ask(hands: Hands, asking: Asking, keep: (lesson: Lesson) => void): Promise<void> {
  const { ports, settings, send, log } = hands;
  const { id, words, seen, signal } = asking;
  const ladder = settings.ladder.value;
  const since = () => Date.now() - asking.releasedAt;

  /** What this conversation holds, with everything this ask says and draws added as it goes out. */
  let draft = asking.lesson;
  const drew = (event: HoldEvent) => void (draft = fold(draft, event));
  /** Known once the answer's first fields are in: where his wrong line is, or that there is none. */
  let headed: { place: Found | null; explains: boolean } | null = null;

  /** The kept page on his screen, when it is one of them, with the other kept pages of its site. */
  const onScreen = whichPage(seen.lines.map((line) => line.text), ports.pages, settings.pageLeastLines.value);
  const known = onScreen ? together(onScreen, ports.pages) : [];
  if (onScreen) log(`${id}: his screen is the kept page "${onScreen.title}" (${onScreen.url}, read ${onScreen.readOn}); given with it: ${known.slice(1).map((page) => page.url).join(", ") || "no other page"}`);
  /**
   * Everything a date in the answer may be taken from: today, his words, his screen, those pages, and what paral
   * remembers as still ahead, whose dates it read on a kept page earlier in this sitting, whatever page he is on now.
   */
  const today = new Date(asking.releasedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const sources = [today, words, ...seen.lines.map((line) => line.text), ...known.flatMap((page) => page.lines), ...asking.ahead.map((step) => step.by)];

  const talk = speech(hands, id, signal);
  const board = card(hands, asking, drew);
  const clip = lessonClip(hands, asking, drew);
  const lead = fast(hands, asking, talk, {
    nothingSaid: () => explained.told() + hinted.told() === 0,
    arriving: () => headed !== null,
    shown: () => board.filled() || explained.markOut() || headed?.place?.found === true,
  });
  const explained = explanation(hands, asking, { talk, board, clip, lead, drew, sources });
  const hinted = ladderHint(hands, asking, { talk, clip, lead, drew });

  /** The rung this ask is on: the first on a new wrong line, the same again when he changed the line, otherwise one up. */
  const plan = (from: Lesson) =>
    next(
      from.rung,
      happened({ hasBreak: from.breakLine !== null, breakRead: from.breakRead, words, lines: seen.lines }, settings.justTellMe.value, settings.sameLineScore.value),
      ladder.length,
    );
  let move = plan(draft);

  /**
   * The answer's first fields are in: the problem, the wrong line or none, and the lesson. What no longer applies is
   * wiped, the clip is started, and the wrong line is ringed. From here the ask is on one road or the other.
   */
  const head = (part: Part) => {
    if (headed || part.problem === undefined || part.breakLine === undefined || part.lesson === undefined) return;
    const newProblem = draft.problem !== null && alike(part.problem, draft.problem) < settings.sameProblemScore.value;
    // A new problem met part-way up the ladder is asked again from the first rung, below; nothing is shown from this reply.
    if (newProblem && move.rung > 0) return;
    if (draft.problem === null || newProblem) drew({ type: "problem.read", text: part.problem });
    const place = part.breakLine === null ? null : locate(part.breakLine, seen.lines, seen.display, settings.groundMinScore.value, part.breakIndex ?? null);
    const nowBreak = place === null ? null : place.found ? place.line : part.breakLine;
    if (asking.markUp && wipes(newProblem, asking.lesson.breakRead ?? asking.lesson.breakLine, nowBreak)) {
      send({ v, type: "clear" });
      drew({ type: "wiped" });
    }
    clip.start(part.lesson, part.result ?? null);
    if (place?.found) hinted.ring(place, move.rung);
    headed = { place, explains: place === null && (part.result ?? null) === null };
    if (place !== null) board.close("his work has a wrong line, so this is a hint");
    log(`${id}: the line ${place === null ? "has no break" : place.found ? "is ringed" : "was not found"} at ${since()} ms from the release`);
    if (place !== null) log(`${id}: the hint road, because the model read "${part.problem}" as his own work with a wrong line: "${part.breakLine}"`);
  };

  const arriving = (part: Part) => {
    // A part that lands after he has pressed the key again belongs to an ask that is over.
    if (signal.aborted) return;
    head(part);
    if (headed?.explains) explained.arriving(part);
  };
  /** Asks the deep model, telling it the quick line he has just heard, the lesson so far and the rung to write for. */
  const think = (from: Lesson, rung: Move, onPart?: (part: Part) => void): Promise<Answered> => {
    const asked = {
      words,
      saidFirst,
      today: asking.releasedAt,
      known,
      ahead: asking.ahead,
      picturePath: seen.picture.path,
      lines: seen.lines.map((line) => line.text),
      circled: asking.circled,
      leadIn: ladder[rung.rung].safe,
      lessons: clip.catalogue,
      lesson: from,
      rung: ladder[rung.rung],
      fresh: rung.fresh,
    };
    return ports.brain.answer(asked, signal, onPart);
  };

  // The deep model is told the quick line word for word, so the answer is asked once that line is settled: at once
  // when it was drafted while he talked, and at the opener's deadline at the latest.
  const saidFirst = await lead.opened;
  if (signal.aborted) return;
  let answered = await think(draft, move, arriving).catch((error) => {
    board.close("the ask failed");
    throw error;
  });
  if (signal.aborted) return;
  if (!headed) {
    const newProblem = draft.problem !== null && alike(answered.problem, draft.problem) < settings.sameProblemScore.value;
    if (newProblem && move.rung > 0) {
      drew({ type: "problem.read", text: answered.problem });
      move = plan(draft);
      answered = await think(draft, move);
      if (signal.aborted) return;
    }
    head({ ...answered, lesson: answered.lesson ?? null, beats: [], whole: true });
  }
  // head() has run by here, in the stream or just above. It sets `headed` from inside a closure, which is why the "!".
  const place = headed!.place;
  drew({ type: "he.tried", words });
  if (place === null) explained.finish(answered);
  else await hinted.finish(answered, place, move.rung);
  if (signal.aborted) return;
  keep(draft);
  if (await clip.show()) keep(draft);
  await talk.finished();
}
