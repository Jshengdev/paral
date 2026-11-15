import type { Hands, Screen } from "./ask.ts";
import { unknownDate, worded } from "./cores/dates.ts";
import { named, type ToKeep } from "./cores/keep.ts";
import { whichPage, type KeptPage } from "./cores/page.ts";
import { point, whereIs } from "./place.ts";
import type { Following, Glanced } from "./ports.ts";
import { SEAM_VERSION, type FromBody } from "../seam/schema.ts";

const v = SEAM_VERSION;
type Look = Extract<FromBody, { type: "look" }>;

/** One thing still ahead for him, as found on a kept page: what, by when as the page writes it, and the page's address. */
export type Ahead = { step: string; by: string; from: string };
/**
 * A step he asked to be shown ("show me"): the kept page it is on, the line of that page that writes its date (null
 * when none is known), its sentence, and the board of all the steps with the row he is on.
 */
export type Led = { page: string; line: string | null; text: string; rows: string[][]; now: number; trail: string[] };
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
export function glances({ ports, settings, send, log }: Hands, remember: (ahead: Ahead[]) => void, showed: (date: ToKeep) => void) {
  /** What each look was found to hold, so the model is asked once: by page, or by page and the question that led there. Null: nothing. */
  const found = new Map<string, Glanced | null>();
  /** What the last look showed and where, so the same thing is not shown twice. */
  let shown: string | null = null;
  let looks = 0;
  let running: AbortController | null = null;
  /** The step that leads the looks on its page, when he has said "show me": they place it, not the page's own thing. */
  let led: Led | null = null;

  /** A look while a step leads: the box or the way for that step, where it now is, with its sentence and the board. */
  function follow(look: Look | Screen, page: KeptPage, step: Led) {
    running?.abort();
    const id = `g${++looks}`;
    const where = step.line === null ? null : whereIs(settings, look, page, { line: step.line, under: "" });
    const at = `step ${step.now} on ${where?.on ?? where?.to ?? ""}`;
    if (at === shown) return log(`${id}: nothing has moved since the last look; what is shown stays`);
    shown = at;
    send({ v, type: "clear" });
    const marked = where ? point(send, id, where) : "no line of this page is known for the step, so nothing is marked";
    send({ v, type: "say", id, beat: 0, text: step.text, trail: step.trail });
    send({ v, type: "mute", id, why: "a look he did not ask for is shown, not spoken" });
    send({ v, type: "board", id, rows: step.rows, now: step.now });
    log(`${id}: following "show me", ${step.trail[1]}: ${marked}`);
  }

  return {
    /** A step takes the lead of the looks on its page, or gives it back (null). */
    lead(step: Led | null) {
      led = step;
      shown = null;
    },
    /** A press of the key ends a look in progress; what it had shown is his to ask about now. */
    stop() {
      running?.abort();
      running = null;
      shown = null;
    },
    async take(look: Look | Screen, asked: Asked | null) {
      const page = whichPage(look.lines.map((line) => line.text), ports.pages, settings.pageLeastLines.value);
      if (page === null || ports.glancer === null) return;
      if (led !== null && led.page === page.name) return follow(look, page, led);
      // He is being followed when he asked something a moment ago and has since come to another kept page.
      const following = asked !== null && asked.page !== page.name ? asked : null;
      const key = following ? `${page.name} after "${following.words}"` : page.name;
      running?.abort();
      const mine = new AbortController();
      running = mine;
      const id = `g${++looks}`;
      const first = !found.has(key);
      if (first) {
        const why = following ? `a look after his ask "${following.words}": he has come to` : "an unasked look: his screen is";
        log(`${id}: ${why} the kept page "${page.title}". Nothing read from his screen leaves the Mac for it: the deep model is asked about the kept page's own text${following ? ", with that question and its answer" : ""}`);
        const glanced = await ports.glancer.glance(page, look.at, mine.signal, following ? { words: following.words, told: following.told } : undefined).catch((error) => {
          if (!mine.signal.aborted) log(`${id}: the look failed (${error instanceof Error ? error.message : error}); nothing is shown`);
          return undefined;
        });
        if (mine.signal.aborted || glanced === undefined) return;
        found.set(key, glanced);
        if (glanced === null) return log(`${id}: ${following ? "what he was sent for is not on this page" : "the page holds nothing that will cost him later"}; nothing is shown`);
        if (!following) remember(glanced.ahead.map((step) => ({ ...step, from: page.url })));
      }
      const glanced = found.get(key);
      if (!glanced) return log(`${id}: this page was looked at before and holds nothing; nothing is shown`);
      // Where the thing is on his screen now: the line itself, the heading it sits under, or the way to it.
      const where = whereIs(settings, look, page, glanced);
      const text = where.inView ? glanced.sayInView : glanced.say;
      const at = `${key} on ${where.on ?? where.to ?? ""}`;
      if (at === shown) return log(`${id}: nothing has moved since the last look; what is shown stays`);
      shown = at;
      // Push: a date this page does not hold would be made up, so a sentence that names one is not shown.
      const today = new Date(look.at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const made = unknownDate(text, [today, ...page.lines]);
      if (made) return log(`${id}: push held back a look's sentence that names a date the page does not hold (${worded(made)}); it was: "${text}"`);
      send({ v, type: "clear" });
      const marked = point(send, id, where);
      const reached = where.inView ? "found the line" : "found where it is";
      // Each step of the trail is something that was done for this look. The model was given this one kept page, up to a number of lines.
      const read = page.lines.length <= settings.pageLinesGiven.value ? "read the whole page" : `read its first ${settings.pageLinesGiven.value} lines`;
      const what = glanced.kind === "passed" ? "found 1 date that has passed" : `found 1 ${glanced.kind}`;
      const trail = following ? ["saw this page", "found what you asked for"] : first ? ["saw this page", read, what] : ["saw this page", reached];
      send({ v, type: "say", id, beat: 0, text, trail });
      send({ v, type: "mute", id, why: "a look he did not ask for is shown, not spoken" });
      // What is ahead stays drawn while he is on this page: it is sent again each time the mark moves. One step to a
      // row: three steps with their dates side by side were shrunk to fit, down to words no one could read.
      if (glanced.ahead.length > 0) send({ v, type: "board", id, rows: glanced.ahead.map((step) => [step.by ? `${step.step}: ${step.by}` : step.step]) });
      // Only a date still ahead is one he can ask to keep: a passed one is told, never offered.
      if (glanced.kind === "date") showed({ title: named(glanced.line, page.title), written: glanced.line, url: page.url });
      log(`${id}: shown without being asked: "${text}"; ${marked}`);
    },
  };
}
