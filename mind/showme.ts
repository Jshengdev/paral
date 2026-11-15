import type { Hands, Screen } from "./ask.ts";
import { saysOnly } from "./cores/catch.ts";
import { unknownDate } from "./cores/dates.ts";
import type { Box } from "./cores/ground.ts";
import { dateLine, type ToKeep } from "./cores/keep.ts";
import { headingOf, type KeptPage } from "./cores/page.ts";
import { inside, type Point } from "./cores/walk.ts";
import type { Ahead, Led } from "./glance.ts";
import { point, whereIs } from "./place.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/** What the walk needs of the looks: to hand them a step to follow, to know where that step's box is, and to place it again. */
type Looks = { lead(step: Led | null, box?: Box | null): void; ring(): Box | null; again(): boolean };

/**
 * "Show me", for one connection: he says only that, and paral walks him through what is still ahead, one step at a
 * time. For the step he is on: the board of all the steps with that one named, one sentence, and a box on the kept
 * line that writes the step's date, or the way to it, or the name of the page it is on. No model is asked: the steps
 * are the ones the looks found on kept pages earlier in this sitting. Until his next ordinary ask the looks follow
 * that step, so the box moves with the page. Two things move him on: saying "show me" again, and a click on the
 * step's box. paral cannot otherwise know that a step is done.
 */
export function shows(hands: Hands, looks: Looks, showed: (date: ToKeep) => void) {
  const { ports, settings, send, log } = hands;
  /** The step he is on, counted from 0; -1 before the first "show me". */
  let on = -1;
  let clicks = 0;

  /** Step `at` of what is ahead, worked out for the page on his screen: its sentence, the board, and the kept line that writes its date. */
  function step(at: number, ahead: Ahead[], page: KeptPage | null) {
    const { step: words, by: written, from: url } = ahead[at];
    const from = ports.pages.find((kept) => kept.url === url) ?? null;
    // A date the step's page does not write would be made up, so it is left out of the sentence.
    const by = written !== "" && from !== null && unknownDate(written, from.lines) === null ? written : "";
    /** The line of the step's page that writes its date: the place to box. */
    const kept = by === "" || from === null ? null : dateLine(by, [from]);
    /** The heading that line sits under on its page: boxed when the line itself is folded away, and what an arrow names. */
    const under = kept === null || from === null ? "" : headingOf(from, kept.written, "");
    const here = from !== null && page !== null && from.name === page.name;
    const sentence = settings.showMeLine.value
      .replace("{n}", String(at + 1))
      .replace("{of}", String(ahead.length))
      .replace("{step}", words.replace(/\.$/, ""))
      .replace("{by}", by === "" ? "" : `, by ${by}`);
    const text = from !== null && !here ? sentence + settings.showMeElsewhere.value.replace("{page}", from.title.split(" - ")[0]) : sentence;
    const rows = ahead.map((each) => [each.by ? `${each.step}: ${each.by}` : each.step]);
    const led: Led | null = from === null ? null : { page: from.name, line: kept?.written ?? null, under, text, rows, now: at, trail: ["show me", `step ${at + 1} of ${ahead.length}`] };
    return { words, by, from, kept, under, here, text, rows, led };
  }

  return {
    /** Whether his words were a bare "show me" with steps to walk. If so it is done here, to the last sound. */
    async asked(id: string, words: string, ahead: Ahead[], seen: Screen, page: KeptPage | null, signal: AbortSignal): Promise<boolean> {
      if (!saysOnly(words, settings.showMeAsks.value)) {
        // An ordinary ask ends the walk's hold on the looks. The step he was on is kept for the next "show me".
        looks.lead(null);
        return false;
      }
      if (ahead.length === 0) {
        log(`${id}: he said "${words}" and nothing is ahead yet, so it is asked as an ordinary question`);
        return false;
      }
      on += 1;
      if (on >= ahead.length) {
        on = -1;
        looks.lead(null);
        log(`${id}: show me, past the last of ${ahead.length} steps; he is told, and the next one starts again from the first`);
        await sayLine(hands, id, settings.showMeDoneLine.value, signal);
        return true;
      }
      const now = step(on, ahead, page);
      send({ v, type: "clear" });
      const where = now.here && now.kept !== null && page !== null ? whereIs(settings, seen, page, { line: now.kept.written, under: now.under }) : null;
      let marked = `it is on ${now.from ? `the page "${now.from.title}"` : "a page that is no longer kept"}`;
      if (now.here) marked = where === null ? "no line of this page is known for the step, so nothing is marked" : point(send, id, where);
      send({ v, type: "board", id, rows: now.rows, now: on });
      if (now.kept !== null) showed(now.kept);
      looks.lead(now.led, where?.inView ? where.box : null);
      hands.noted?.({ kind: "showme" });
      log(`${id}: show me, step ${on + 1} of ${ahead.length}: ${now.words}${now.by === "" ? "" : ` (by ${now.by})`}; ${marked}`);
      await sayLine(hands, id, now.text, signal);
      return true;
    },

    /**
     * He pressed the left button somewhere. When a step leads and its box is on the step's own line, a click inside
     * that box (grown a little, so its edge counts) is the step done: the walk moves on as if he had said "show me"
     * again, shown and not spoken. A click anywhere else is not the walk's. Gives back whether the walk moved.
     */
    clicked(at: Point, ahead: Ahead[], page: KeptPage | null): boolean {
      const box = looks.ring();
      if (on < 0 || box === null || !inside(at, box, settings.clickGrow.value)) return false;
      const id = `c${++clicks}`;
      const done = on + 1;
      on += 1;
      hands.noted?.({ kind: "showme" });
      const next = on < ahead.length ? step(on, ahead, page) : null;
      if (next?.kept) showed(next.kept);
      looks.lead(next?.led ?? null);
      // The looks place the next step from the last look they took; with none to place it on, it is shown without a mark.
      if (next === null || !looks.again()) {
        send({ v, type: "clear" });
        send({ v, type: "say", id, beat: 0, text: next?.text ?? settings.showMeDoneLine.value, trail: ["show me", next ? `step ${on + 1} of ${ahead.length}` : "every step done"] });
        send({ v, type: "mute", id, why: "a step his click moved to is shown, not spoken" });
        if (next) send({ v, type: "board", id, rows: next.rows, now: on });
      }
      if (next === null) on = -1;
      log(`${id}: his click on the box of step ${done} of ${ahead.length} is that step done; ${next ? `now step ${done + 1}: ${next.words}` : "that was the last, and the next \"show me\" starts again from the first"}`);
      return true;
    },
  };
}
