import { explain, fitted, givesAway, hint, WHOLE, wipes, type Planned } from "./cores/beats.ts";
import { card } from "./card.ts";
import { lessonClip } from "./clip.ts";
import { fast } from "./fast.ts";
import { alike, locate, type Found } from "./cores/ground.ts";
import { happened } from "./cores/happened.ts";
import { fold, type Lesson } from "./cores/hold.ts";
import { holdsResult, holdsValue, judge } from "./cores/push.ts";
import { next } from "./cores/teach.ts";
import type { Answered, Opened, Part, Ports } from "./ports.ts";
import type { Settings } from "./settings.ts";
import { speech } from "./speech.ts";
import { SEAM_VERSION, type FromBody, type FromMind } from "../seam/schema.ts";

export type Screen = Extract<FromBody, { type: "screen" }>;
export type Hands = { ports: Ports; settings: Settings; send: (line: FromMind) => void; log: (line: string) => void };
export type Asking = { id: string; words: string; seen: Screen; circled: number[]; lesson: Lesson; markUp: boolean; releasedAt: number; opener: Promise<Opened> | null; signal: AbortSignal };

const v = SEAM_VERSION;

/**
 * One ask, from his final words to the last sound sent. The answer is acted on while it is still arriving: the ring
 * goes out when the broken line is known, and each sentence of an explanation when it is finished.
 * `keep` is called when what he was shown is settled: once for the words and marks, and again if a clip follows them.
 */
export async function ask(hands: Hands, asking: Asking, keep: (lesson: Lesson) => void): Promise<void> {
  const { ports, settings, send, log } = hands;
  const { id, words, seen, signal } = asking;
  const ladder = settings.ladder.value;
  const since = () => Date.now() - asking.releasedAt;
  const lines = seen.lines.map((line) => line.text);
  const talk = speech(hands, id, signal);
  let draft = asking.lesson;
  let headed: { place: Found | null; explains: boolean } | null = null;
  let told = 0;
  let led = false;
  /** The first sentence's mark, once it has gone out ahead of its sentence. */
  let markOut = false;
  const board = card(hands, asking, (event) => (draft = fold(draft, event)));
  const clip = lessonClip(hands, asking, (event) => (draft = fold(draft, event)));

  const lead = fast(hands, asking, talk, { nothingSaid: () => told === 0, explains: () => !clip.on() && headed?.explains === true, arriving: () => headed !== null, shown: () => board.filled() || markOut || headed?.place?.found === true });
  /** How many lines were said before the answer (the line about the page, stall lines): the answer is numbered after them. */
  const base = () => lead.count();

  const plan = (from: Lesson) =>
    next(
      from.rung,
      happened({ hasBreak: from.breakLine !== null, breakRead: from.breakRead, words, lines: seen.lines }, settings.justTellMe.value, settings.sameLineScore.value),
      ladder.length,
    );
  let move = plan(draft);
  /** The rung's fixed line, unless he has heard it before. It is said with the ring, so the wait for the hint is not silent. */
  const leadIn = (rung: number) => (asking.lesson.shown.includes(ladder[rung].safe) ? null : ladder[rung].safe);

  /** The problem and the broken line are known: wipe what no longer applies, and ring the line. */
  const head = (part: Part) => {
    if (headed || part.problem === undefined || part.breakLine === undefined || part.lesson === undefined) return;
    const newProblem = draft.problem !== null && alike(part.problem, draft.problem) < settings.sameProblemScore.value;
    if (newProblem && move.rung > 0) return;
    if (draft.problem === null || newProblem) draft = fold(draft, { type: "problem.read", text: part.problem });
    const place = part.breakLine === null ? null : locate(part.breakLine, seen.lines, seen.display, settings.groundMinScore.value, part.breakIndex ?? null);
    const nowBreak = place === null ? null : place.found ? place.line : part.breakLine;
    if (asking.markUp && wipes(newProblem, asking.lesson.breakRead ?? asking.lesson.breakLine, nowBreak)) {
      send({ v, type: "clear" });
      draft = fold(draft, { type: "wiped" });
    }
    clip.start(part.lesson, part.result ?? null);
    if (place?.found) {
      const kind = fitted("ring", place.line, seen.lines, settings.ringReach.value, seen.display.scale);
      send({ v, type: "mark", id, beat: base(), kind, box: place.box });
      draft = fold(draft, { type: "mark.drawn", kind, line: place.line });
      const lead = clip.on() ? null : leadIn(move.rung);
      if (lead !== null) {
        send({ v, type: "say", id, beat: base(), text: lead, rung: move.rung, of: ladder.length });
        talk.speak(base(), lead);
        told = 1;
        led = true;
      }
    }
    headed = { place, explains: place === null && (part.result ?? null) === null };
    if (place !== null) board.close("his work has a wrong line, so this is a hint");
    lead.aboutThePage();
    log(`${id}: the line ${place === null ? "has no break" : place.found ? "is ringed" : "was not found"} at ${since()} ms from the release`);
    if (place !== null) log(`${id}: the hint road, because the model read "${part.problem}" as his own work with a wrong line: "${part.breakLine}"`);
  };

  /** An explanation's finished sentences go out as they come, each with its mark. */
  const tell = (planned: Planned[]) => {
    for (; told < planned.length; told++) {
      const { say, mark } = planned[told];
      send({ v, type: "say", id, beat: base() + told, text: say });
      if (mark && !(told === 0 && markOut)) {
        send({ v, type: "mark", id, beat: base() + told, kind: mark.kind, box: mark.box, ...(mark.label ? { label: mark.label } : {}) });
        draft = fold(draft, { type: "mark.drawn", kind: mark.kind, line: mark.line });
      }
      talk.speak(base() + told, say);
      if (told === 0) log(`${id}: first sentence at ${since()} ms from the release`);
    }
  };
  const mapped = (reply: { result?: string | null; beats: Answered["beats"] }) =>
    explain({ result: reply.result ?? null, beats: reply.beats }, seen.lines, seen.display, settings.groundMinScore.value, clip.on() ? 1 : settings.maxBeats.value, settings.ringReach.value, clip.on() ? WHOLE : settings.sentenceMaxWords.value);

  /** The first sentence's mark goes out the moment it is whole, ahead of the sentence. Later marks keep to their sentences. */
  const markNow = (part: Part) => {
    if (markOut || told > 0 || part.beats.length > 0 || !part.nextMark) return;
    const mark = mapped({ beats: [{ say: ".", mark: part.nextMark }] }).at(-1)?.mark;
    if (!mark) return;
    markOut = true;
    send({ v, type: "mark", id, beat: base(), kind: mark.kind, box: mark.box, ...(mark.label ? { label: mark.label } : {}) });
    draft = fold(draft, { type: "mark.drawn", kind: mark.kind, line: mark.line });
    log(`${id}: the first mark at ${since()} ms from the release, ahead of its sentence`);
  };
  const arriving = (part: Part) => {
    head(part);
    if (!headed?.explains) return;
    if (!clip.on()) board.fill(part.board);
    if (part.board === null) board.close("the answer has no board");
    markNow(part);
    tell(mapped(part));
  };
  const think = (from: Lesson, rung: { rung: number; fresh: boolean }, onPart?: (part: Part) => void): Promise<Answered> =>
    ports.brain.answer({ words, picturePath: seen.picture.path, lines, circled: asking.circled, leadIn: leadIn(rung.rung), lessons: clip.catalogue, lesson: from, rung: ladder[rung.rung], fresh: rung.fresh }, signal, onPart);

  let answered = await think(draft, move, arriving).catch((error) => {
    board.close("the ask failed");
    throw error;
  });
  if (signal.aborted) return;
  if (!headed) {
    const newProblem = draft.problem !== null && alike(answered.problem, draft.problem) < settings.sameProblemScore.value;
    if (newProblem && move.rung > 0) {
      draft = fold(draft, { type: "problem.read", text: answered.problem });
      move = plan(draft);
      answered = await think(draft, move);
      if (signal.aborted) return;
    }
    head({ ...answered, lesson: answered.lesson ?? null, beats: [], whole: true });
  }
  // head() has run by here, in the stream or just above. It sets `headed` from inside a closure, which is why the "!".
  const place = headed!.place;
  draft = fold(draft, { type: "he.tried", words });

  if (place === null) {
    let planned = mapped(answered);
    const leak = givesAway(planned, answered.result);
    if (leak) {
      planned = [{ say: settings.heldBackLine.value, mark: null }];
      log(`${id}: push held back an explanation that gave the result away`);
    }
    tell(planned);
    if (leak) clip.drop();
    const rows = leak || clip.on() ? null : answered.board;
    board.fill(rows);
    board.close("no board came");
    draft = fold(draft, { type: "break.fixed" });
    const pageLine = lead.pageLine();
    if (pageLine !== null) draft = fold(draft, { type: "line.shown", text: pageLine });
    for (const { say } of planned) draft = fold(draft, { type: "line.shown", text: say });
    keep(draft);
    log(`${id}: ${planned.length} sentence${planned.length === 1 ? "" : "s"}, all sent at ${since()} ms from the release`);
    if (await clip.show()) keep(draft);
    return void (await talk.finished());
  }

  const sentences = hint(answered, clip.on() ? 1 : ladder[move.rung].sentences, clip.on() ? WHOLE : settings.sentenceMaxWords.value);
  const line = sentences.join(" ");
  const safe = ladder[move.rung].safe;
  // Numbers that stand on his own wrong line may be spoken of; any other number of his result may not.
  const onHisLine = [answered.breakLine, place.found ? place.line : "", asking.lesson.breakRead ?? ""].join(" ");
  const codeSaysLeak = answered.result !== null && (holdsResult(line, answered.result) || holdsValue(line, answered.result, onHisLine));
  const secondLook = codeSaysLeak ? null : await ports.secondLook.leaks(line, answered.problem, signal);
  if (signal.aborted) return;
  const verdict = judge({ line, result: answered.result, secondLook, safe, onHisLine });
  if (verdict.verdict === "leak") log(`${id}: push swapped a leaked hint for the safe line of rung ${move.rung} (${verdict.why})`);
  // After a leak the safe line stands in for the hint. When it was already said with the ring, nothing more is said.
  const shown = verdict.verdict !== "leak" ? sentences : led ? [] : [safe];
  const from = led ? 1 : 0;
  shown.forEach((text, index) => {
    const first = index === 0 && !place.found ? `${settings.notFoundLine.value} ${text}` : text;
    send({ v, type: "say", id, beat: base() + from + index, text: first, rung: move.rung, of: ladder.length });
    talk.speak(base() + from + index, first);
  });
  told = from + shown.length;
  if (led) draft = fold(draft, { type: "line.shown", text: safe });
  // The hint road is only reached with a wrong line named, so breakLine is there.
  draft = fold(draft, { type: "break.found", line: answered.breakLine!, read: place.found ? place.line : null });
  draft = fold(draft, { type: "rung.given", rung: move.rung });
  for (const text of shown) draft = fold(draft, { type: "line.shown", text });
  keep(draft);
  log(`${id}: rung ${move.rung}; hint at ${since()} ms from the release${verdict.verdict === "leak" ? "; LEAK CAUGHT" : ""}`);
  if (verdict.verdict !== "leak" && (await clip.show())) keep(draft);
  await talk.finished();
}
