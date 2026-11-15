import type { Hands, Screen } from "./ask.ts";
import { away, unknownDate, worded } from "./cores/dates.ts";
import type { Box } from "./cores/ground.ts";
import { named, type ToKeep } from "./cores/keep.ts";
import { headingOf, whichPage, type KeptPage } from "./cores/page.ts";
import { finished, point, whereIs, type More } from "./place.ts";
import type { Following, Glanced } from "./ports.ts";
import { speech } from "./speech.ts";
import { SEAM_VERSION, type FromBody } from "../seam/schema.ts";

const v = SEAM_VERSION;
/** A stop signal that never fires: a look's question to the model is not withdrawn (see `take`). */
const never = new AbortController().signal;
type Look = Extract<FromBody, { type: "look" }>;

/** One thing still ahead for him, as found on a kept page: what, by when as the page writes it, the page's address, and the line of that page where it is written, when it has one. */
export type Ahead = { step: string; by: string; from: string; at?: string };
/**
 * A step he asked to be shown ("show me"): the kept page it is on, the line of that page that writes its date (null
 * when none is known) and the heading the page puts that line under, its sentence, and the board of all the steps
 * with the row he is on. `done` holds the lines of the steps behind him that are on the same page.
 */
export type Led = { page: string; line: string | null; under: string; text: string; rows: string[][]; now: number; trail: string[]; done?: { line: string; under: string }[] };
/** What he asked a moment ago, what he was told, and the kept page he was on then (null if none). */
export type Asked = Following & { page: string | null };

/**
 * The looks paral takes without being asked, for one connection. A look does something only when his screen is one
 * of USC's kept pages. The first time a page is seen, the deep model is asked about the kept page's own text:
 * whether it holds one thing that will cost him later, or a deadline that has passed on a page that still reads as
 * open. Nothing read from his screen is sent for that. If it does,
 * the line is marked where it is on his screen now (the line itself, or the heading it sits under), one sentence is
 * shown in the capsule with the trail of what was done, and what is still ahead is drawn as a board. It is shown,
 * not spoken. When he scrolls or opens a section the mark moves to where the thing now is; when the thing is
 * out of view, the way to it is sent in the mark's place. A date it shows is
 * the one he can ask to keep.
 *
 * When he has just asked something and then come to another kept page, the look is for what he was sent there for:
 * that is how paral guides him from page to page without clicking anything itself.
 */
export function glances({ ports, settings, send, log, noted }: Hands, remember: (ahead: Ahead[]) => void, showed: (date: ToKeep) => void) {
  /** What each look was found to hold, so the model is asked once: by page, or by page and the question that led there. Null: nothing. */
  const found = new Map<string, Glanced | null>();
  /** What the last look showed, on which line, and where that line's box was, so the same thing is not shown twice. */
  let shown: string | null = null;
  let shownAt: Box | null = null;
  /**
   * Whether this is what is already shown, where it is shown: the same thing on the same line, with the line's box
   * within a few points of where it was. A scroll that keeps the line in view moves the box, and the mark with it.
   */
  function stays(what: string, box: Box | null): boolean {
    const least = settings.movedLeast.value;
    const near = box === null || shownAt === null ? box === shownAt : Math.abs(box.x - shownAt.x) < least && Math.abs(box.y - shownAt.y) < least;
    const same = what === shown && near;
    [shown, shownAt] = [what, box];
    return same;
  }
  let looks = 0;
  let running: AbortController | null = null;
  /** The step that leads the looks on its page, when he has said "show me": they place it, not the page's own thing. */
  let led: Led | null = null;
  /** The box on the leading step's own line while that line is in view: where a click of his counts as the step done. */
  let ringed: Box | null = null;
  /** The last look taken on a kept page, so a step can be placed again without waiting for the next one. */
  let last: { look: Look | Screen; page: KeptPage } | null = null;
  /** The looks being answered by the model now, by the same key as `found`. */
  const beingAsked = new Map<string, Promise<Glanced | null | void>>();
  /** The pages whose look has been said aloud in this sitting: each is said once. */
  const saidAloud = new Set<string>();
  /** The page on which each ask he followed was found to end, by the words of the ask. */
  const endedOn = new Map<string, string>();

  /** A look while a step leads: the box or the way for that step, where it now is, with its sentence and the board. */
  function follow(look: Look | Screen, page: KeptPage, step: Led) {
    running?.abort();
    const id = `g${++looks}`;
    const where = step.line === null ? null : whereIs(settings, look, page, { line: step.line, under: step.under });
    ringed = where?.inView ? where.box : null;
    if (stays(`step ${step.now} on ${where?.on ?? where?.to ?? ""}`, where?.box ?? null)) return log(`${id}: nothing has moved since the last look; what is shown stays`);
    send({ v, type: "clear" });
    const tags = settings.markTags.value;
    const marked = where ? point(send, id, where, tags ? { tag: { label: settings.walkTags.value.next, tone: "strong" } } : {}) : "no line of this page is known for the step, so nothing is marked";
    if (tags) finished(send, id, settings, look, page, step.done ?? [], settings.walkTags.value.done);
    send({ v, type: "say", id, beat: 0, text: step.text, trail: step.trail });
    send({ v, type: "mute", id, why: "a look he did not ask for is shown, not spoken" });
    send({ v, type: "board", id, rows: step.rows, now: step.now });
    log(`${id}: following "show me", ${step.trail[1]}: ${marked}`);
    noted?.({ kind: "look", on: where?.inView ? "line" : where?.box ? "heading" : "nothing" });
  }

  return {
    /** A step takes the lead of the looks on its page, or gives it back (null). `box` is where its own line is now, if it was just placed in view. */
    lead(step: Led | null, box: Box | null = null) {
      led = step;
      [shown, shownAt] = [null, null];
      ringed = box;
    },
    /** The box on the leading step's own line, or null when no step leads or its line is not in view. */
    ring: () => ringed,
    /** Places the leading step again from the last look, without waiting for the next. False when there is no look of its page to place it on. */
    again(): boolean {
      if (led === null || last === null || last.page.name !== led.page) return false;
      follow(last.look, last.page, led);
      return true;
    },
    /** A press of the key ends a look in progress; what it had shown is his to ask about now. */
    stop() {
      running?.abort();
      running = null;
      [shown, shownAt] = [null, null];
    },
    async take(look: Look | Screen, asked: Asked | null): Promise<void> {
      const page = whichPage(look.lines.map((line) => line.text), ports.pages, settings.pageLeastLines.value);
      if (page === null || ports.glancer === null) return;
      last = { look, page };
      if (led !== null && led.page === page.name) return follow(look, page, led);
      // He is being followed when he asked something a moment ago and has since come to another kept page. That ends
      // on the page that holds what he was sent for: a page he opens after it, or one found not to hold it, gets a
      // look of its own.
      const sent = asked !== null && asked.page !== page.name && [undefined, page.name].includes(endedOn.get(asked.words)) ? asked : null;
      const following = sent !== null && found.get(`${page.name} after "${sent.words}"`) !== null ? sent : null;
      const key = following ? `${page.name} after "${following.words}"` : page.name;
      running?.abort();
      const mine = new AbortController();
      running = mine;
      const id = `g${++looks}`;
      const first = !found.has(key);
      if (first) {
        const why = following ? `a look after his ask "${following.words}": he has come to` : "an unasked look: his screen is";
        log(`${id}: ${why} the kept page "${page.title}". Nothing read from his screen leaves the Mac for it: the deep model is asked about the kept page's own text${following ? ", with that question and its answer" : ""}`);
        // The model is asked to the end even when he presses the key or another page comes up meanwhile: what it
        // finds is kept, so the steps are there for "show me" and the page is not asked about twice. Only the showing
        // stops. A look of the same page that comes while it is being asked waits for the same answer.
        let asking = beingAsked.get(key);
        if (asking === undefined) {
          asking = ports.glancer
            .glance(page, look.at, never, following ? { words: following.words, told: following.told } : undefined)
            .catch((error) => void log(`${id}: the look failed (${error instanceof Error ? error.message : error}); nothing is shown`))
            .finally(() => beingAsked.delete(key));
          beingAsked.set(key, asking);
        }
        const glanced = await asking;
        if (glanced === undefined) return;
        if (!found.has(key)) {
          // The heading is read from the kept page, not taken on the model's word: once it named the site's menu instead.
          if (glanced !== null) glanced.under = headingOf(page, glanced.line, glanced.under);
          found.set(key, glanced);
          if (glanced !== null && following) endedOn.set(following.words, page.name);
          if (glanced !== null && !following) remember(glanced.ahead.map((step) => ({ ...step, from: page.url })));
        }
        if (mine.signal.aborted) return log(`${id}: he pressed the key, or another page came up, before this look was answered; what it found is kept and not shown now`);
        if (glanced === null && following) {
          log(`${id}: what he was sent for is not on this page; the page gets a look of its own`);
          return this.take(look, asked);
        }
        if (glanced === null) return log(`${id}: the page holds nothing that will cost him later; nothing is shown`);
      }
      const glanced = found.get(key);
      if (!glanced) return log(`${id}: this page was looked at before and holds nothing; nothing is shown`);
      // Where the thing is on his screen now: the line itself, the heading it sits under, or the way to it.
      const where = whereIs(settings, look, page, glanced);
      const text = where.inView ? glanced.sayInView : glanced.say;
      if (stays(`${key} on ${where.on ?? where.to ?? ""}`, where.box)) return log(`${id}: nothing has moved since the last look; what is shown stays`);
      // Push: a date this page does not hold would be made up, so a sentence that names one is not shown.
      const today = new Date(look.at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const made = unknownDate(text, [today, ...page.lines]);
      if (made) return log(`${id}: push held back a look's sentence that names a date the page does not hold (${worded(made)}); it was: "${text}"`);
      send({ v, type: "clear" });
      // On the thing's own line: a date ahead gets its count beside it, a passed one is struck through with how long ago.
      const count = settings.markTags.value && !following && glanced.kind !== "step" ? away(glanced.line, new Date(look.at)) : null;
      const more: More = count === null ? {} : { strike: glanced.kind === "passed" && count.days < 0, tag: { label: count.words, tone: count.days < 0 ? "quiet" : "date" } };
      const marked = point(send, id, where, more);
      const reached = where.inView ? "found the line" : "found where it is";
      // Each step of the trail is something that was done for this look. The model was given this one kept page, up to a number of lines.
      const read = page.lines.length <= settings.pageLinesGiven.value ? "read the whole page" : `read its first ${settings.pageLinesGiven.value} lines`;
      const what = glanced.kind === "passed" ? "found 1 date that has passed" : `found 1 ${glanced.kind}`;
      const trail = following ? ["saw this page", "found what you asked for"] : first ? ["saw this page", read, what] : ["saw this page", reached];
      // A date still ahead can be kept: the body may offer it as a button, which sends "add it to my calendar" as a tapped line.
      send({ v, type: "say", id, beat: 0, text, trail, ...(glanced.kind === "date" ? { keep: true } : {}) });
      // The first time a page's look shows a date, ahead or passed, it is also said aloud, once for the page. A look
      // that only moves its mark, a step with no date, and a look after his ask are shown and not spoken. A press of
      // the key stops it, as it stops the look.
      if (settings.unaskedVoice.value && first && !following && glanced.kind !== "step" && !saidAloud.has(page.name)) {
        saidAloud.add(page.name);
        speech({ ports, settings, send, log }, id, mine.signal).speak(0, text);
      } else send({ v, type: "mute", id, why: "a look he did not ask for is shown, not spoken" });
      // What is ahead stays drawn while he is on this page: it is sent again each time the mark moves. One step to a
      // row: three steps with their dates side by side were shrunk to fit, down to words no one could read.
      if (glanced.ahead.length > 0) send({ v, type: "board", id, rows: glanced.ahead.map((step) => [step.by ? `${step.step}: ${step.by}` : step.step]) });
      // Only a date still ahead is one he can ask to keep: a passed one is told, never offered.
      if (glanced.kind === "date") showed({ title: named(glanced.line, page.title), written: glanced.line, url: page.url });
      log(`${id}: shown without being asked: "${text}"; ${marked}`);
      noted?.({ kind: "look", on: where.inView ? "line" : where.box ? "heading" : "nothing" });
    },
  };
}
