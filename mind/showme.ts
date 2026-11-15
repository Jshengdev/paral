import type { Hands, Screen } from "./ask.ts";
import { saysOnly } from "./cores/catch.ts";
import { unknownDate } from "./cores/dates.ts";
import { dateLine, type ToKeep } from "./cores/keep.ts";
import type { KeptPage } from "./cores/page.ts";
import type { Ahead, Led } from "./glance.ts";
import { point, whereIs } from "./place.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/**
 * "Show me", for one connection: he says only that, and paral walks him through what is still ahead, one step each
 * time he says it. For the step he is on: the board of all the steps with that one named, one spoken sentence, and
 * a box on the kept line that writes the step's date, or the way to it, or the name of the page it is on. No model
 * is asked: the steps are the ones the looks found on kept pages earlier in this sitting. Until his next ordinary
 * ask the looks follow that step (`lead`), so the box moves with the page. paral cannot know that a step is done;
 * "show me" again is how he moves on.
 */
export function shows(hands: Hands, lead: (step: Led | null) => void, showed: (date: ToKeep) => void) {
  const { ports, settings, send, log } = hands;
  /** The step he is on, counted from 0; -1 before the first "show me". */
  let on = -1;

  return {
    /** Whether his words were a bare "show me" with steps to walk. If so it is done here, to the last sound. */
    async asked(id: string, words: string, ahead: Ahead[], seen: Screen, page: KeptPage | null, signal: AbortSignal): Promise<boolean> {
      if (!saysOnly(words, settings.showMeAsks.value)) {
        // An ordinary ask ends the walk's hold on the looks. The step he was on is kept for the next "show me".
        lead(null);
        return false;
      }
      if (ahead.length === 0) {
        log(`${id}: he said "${words}" and nothing is ahead yet, so it is asked as an ordinary question`);
        return false;
      }
      on += 1;
      if (on >= ahead.length) {
        on = -1;
        lead(null);
        log(`${id}: show me, past the last of ${ahead.length} steps; he is told, and the next one starts again from the first`);
        await sayLine(hands, id, settings.showMeDoneLine.value, signal);
        return true;
      }
      const step = ahead[on];
      const of = ahead.length;
      const from = ports.pages.find((kept) => kept.url === step.from) ?? null;
      // A date the step's page does not write would be made up, so it is left out of the sentence.
      const by = step.by !== "" && from !== null && unknownDate(step.by, from.lines) === null ? step.by : "";
      /** The line of the step's page that writes its date: the place to box. */
      const kept = by === "" || from === null ? null : dateLine(by, [from]);
      const here = from !== null && page !== null && from.name === page.name;

      const sentence = settings.showMeLine.value
        .replace("{n}", String(on + 1))
        .replace("{of}", String(of))
        .replace("{step}", step.step.replace(/\.$/, ""))
        .replace("{by}", by === "" ? "" : `, by ${by}`);
      const text = from !== null && !here ? sentence + settings.showMeElsewhere.value.replace("{page}", from.title.split(" - ")[0]) : sentence;
      const rows = ahead.map((each) => [each.by ? `${each.step}: ${each.by}` : each.step]);

      send({ v, type: "clear" });
      let marked = `it is on ${from ? `the page "${from.title}"` : "a page that is no longer kept"}`;
      if (here) marked = kept === null ? "no line of this page is known for the step, so nothing is marked" : point(send, id, whereIs(settings, seen, page, { line: kept.written, under: "" }));
      send({ v, type: "board", id, rows, now: on });
      if (kept !== null) showed(kept);
      if (from !== null) lead({ page: from.name, line: kept?.written ?? null, text, rows, now: on, trail: ["show me", `step ${on + 1} of ${of}`] });
      log(`${id}: show me, step ${on + 1} of ${of}: ${step.step}${by === "" ? "" : ` (by ${by})`}; ${marked}`);
      await sayLine(hands, id, text, signal);
      return true;
    },
  };
}
