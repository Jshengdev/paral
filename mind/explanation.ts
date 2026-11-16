import type { Asking, Hands } from "./ask.ts";
import type { card } from "./card.ts";
import type { lessonClip } from "./clip.ts";
import { explain, WHOLE, type Planned } from "./cores/beats.ts";
import { columnNotes, columnRows, firstParts, grow, lifted, rowNotes, wholeRows, writtenRows, type Growing, type Note } from "./cores/board.ts";
import { asWritten, unknownDate, worded } from "./cores/dates.ts";
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
  /** Whether he asked for the whole thing drawn: more sentences, and a board that grows a row with each (`cores/board.ts`). */
  whole: boolean;
  /** Whether it is a broad follow-up: more sentences, and everything else as any explanation (`cores/full.ts`). */
  full: boolean;
  /** Whether he asked, as a follow-up, for a drawing of what was just said: a board written one box to a row is a column (`cores/board.ts`). */
  column: boolean;
  /** Whether he asked to be shown what a thing would look like: a board written one box to a row is words alone, a line a sentence. */
  written: boolean;
};

/**
 * The answer when his work has no wrong line: up to three sentences, each with its mark, and a board. It is acted on
 * while it arrives: the board goes out when it is whole, the first mark ahead of its sentence, and each sentence when
 * it is finished. With a lesson clip coming it is one sentence and no board.
 */
export function explanation({ settings, send, log }: Hands, asking: Asking, { talk, board, clip, lead, drew, sources, whole, full, column, written }: With) {
  const { id, seen } = asking;
  const since = () => Date.now() - asking.releasedAt;
  /** How many of its sentences are out, and whether the first mark went out ahead of its sentence. */
  let told = 0;
  let markOut = false;
  /** Sentences that were not said, since they named a date found on no page paral has read. */
  const held = new Set<string>();

  /** How many sentences it may have, and how long each may be before it is spoken as two. */
  const most = () => (clip.on() ? 1 : whole ? settings.wholeBoardMost.value : full ? settings.fullAnswerMost.value : settings.maxBeats.value);
  const breath = () => (clip.on() ? WHOLE : settings.sentenceMaxWords.value);
  /**
   * On a whole board and on a column the model may write a note or two into the rows (`cores/board.ts`): they are
   * lifted out, and the rows go on without them. `noted` keeps them; any other ask's board is left as it was written.
   */
  let noted: Note[] = [];
  const clean = (given: string[][] | null | undefined) => {
    if (!(whole || column) || !given) return given;
    const got = lifted(given, settings.notesMost.value, settings.noteWords.value);
    noted = got.notes;
    return got.rows;
  };
  /** A column that is out, and the beats of the answer's sentences said so far: its notes come with the sentences after the first. */
  let steps: string[][] | null = null;
  const saidOn: number[] = [];
  let notesOut = 0;

  /**
   * A board that grows with its answer (the whole thing drawn, or words alone): its rows, where each written
   * sentence starts among the spoken ones, and the rows said so far. `lines` reads them from the board as written:
   * none for any other ask, and none when an ask for words alone was written as boxes.
   */
  const lines = (given: string[][] | null | undefined) => (whole ? wholeRows(clean(given), most()) : written ? (writtenRows(given, settings.writtenMost.value) ?? []) : []);
  let rows: string[][] = [];
  let firsts: number[] = [];
  let growing: Growing = { beats: [], stopped: false };
  /** A spoken sentence has gone by, said on `beat` or held back (null): the board grows by its row, if it has one. */
  const grows = (place: number, beat: number | null) => {
    const next = rows.length > 0 && !clip.on() ? grow(growing, rows.length, firsts, place, beat) : growing;
    if (next === growing) return;
    growing = next;
    if (beat !== null) board.grow(rows, growing.beats, whole ? undefined : "words", whole ? rowNotes(noted.filter((note) => note.row < rows.length), growing.beats) : []);
  };
  /** A sentence is about to be said on `beat`: a column's next note gets it, and the board says so. */
  const notes = (beat: number) => {
    saidOn.push(beat);
    if (!steps) return;
    const now = columnNotes(noted.filter((note) => note.row < steps!.length), saidOn);
    const withBeat = now.filter((note) => note.beat !== undefined).length;
    if (withBeat > notesOut) board.note(steps, now);
    notesOut = withBeat;
  };

  /** The board goes out as it was written, or as a column when this ask may be one and the model wrote one. */
  const fill = (written: string[][] | null | undefined) => {
    const given = clean(written);
    const made = column ? columnRows(given, settings.columnMost.value) : null;
    if (!made) return board.fill(given);
    if (!board.filled()) steps = made;
    board.fill(made, "column", columnNotes(noted.filter((note) => note.row < made.length), []));
  };

  /** The model's sentences, with a date it wrote the way it is said put back the way a page writes it (`asWritten`). */
  const asThePage = (beats: Answered["beats"]) => beats.map((beat) => ({ ...beat, say: asWritten(beat.say, sources) }));
  /** The reply so far as sentences, each with its mark found on his screen. */
  const planned = (reply: { result?: string | null; beats: Answered["beats"] }) =>
    explain({ result: reply.result ?? null, beats: asThePage(reply.beats) }, seen.lines, seen.display, settings.groundMinScore.value, most(), settings.ringReach.value, breath());
  /** The same, for the answer's own sentences: it also notes where each written sentence starts among the spoken ones. */
  const plan = (reply: { result?: string | null; beats: Answered["beats"] }) => {
    firsts = firstParts(asThePage(reply.beats).slice(0, most()).map((beat) => beat.say), breath());
    return planned(reply);
  };

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
        grows(told, null);
        continue;
      }
      grows(told, beat);
      notes(beat);
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
      if (rows.length === 0) rows = lines(part.board);
      if (!whole && rows.length === 0 && !clip.on()) fill(part.board);
      if (part.board === null) board.close("the answer has no board");
      markAhead(part);
      tell(plan(part));
    },
    /**
     * The whole answer is here: the sentences still to say, then the board. An answer that gives his result away is
     * held back whole, with one fixed line in its place and no board or clip. Gives back whether the model's own
     * sentences were said.
     */
    finish(answered: Answered): boolean {
      let sentences = plan(answered);
      const leak = givesAway(sentences, answered.result);
      // The rows are set before the last sentences are said; an answer held back, or one with a clip, has none.
      if (whole || written) rows = leak || clip.on() ? [] : rows.length > 0 ? rows : lines(answered.board);
      if (leak) {
        log(`${id}: push held back an explanation that gave the result away; it was: "${sentences.map((beat) => beat.say).join(" ")}"`);
        sentences = [{ say: settings.heldBackLine.value, mark: null }];
        clip.drop();
      }
      tell(sentences);
      if (growing.beats.length > 0) drew({ type: "board.drawn", rows: rows.slice(0, growing.beats.length) });
      else if (!whole && rows.length === 0) fill(leak || clip.on() ? null : answered.board);
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
