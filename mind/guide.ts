import type { Hands } from "./ask.ts";
import { nextStep, note, nothingYet, type Noted, type Seen } from "./cores/guide.ts";
import type { KeptPage } from "./cores/page.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/**
 * The demo's guide, for one connection: for the kept page on his screen it tells the body what to do next, one step
 * at a time (`demoSteps`), and moves on when the mind sees the step happen. It asks no model and watches nothing of
 * its own: it is told what the looks, the walk, the calendar step and the asks already know. A page with no steps
 * gets an empty line, which shows no card.
 */
export function guides({ settings, send, log }: Pick<Hands, "settings" | "send" | "log">) {
  /** What has been seen to happen on each page, by the page's name. */
  const seen = new Map<string, Seen>();
  let page: KeptPage | null = null;
  /** The line the body was last sent, so the same one is not sent twice. */
  let told = "";

  function tell() {
    const steps = page === null ? undefined : settings.demoSteps.value[page.name];
    const at = steps === undefined ? -1 : nextStep(steps, seen.get(page!.name) ?? nothingYet);
    const line =
      steps === undefined ? { text: "", n: 0, of: 0 } : at < 0 ? { text: settings.demoDoneLine.value, n: steps.length, of: steps.length, done: true } : { text: steps[at].text, n: at + 1, of: steps.length };
    if (JSON.stringify(line) === told) return;
    told = JSON.stringify(line);
    send({ v, type: "next", ...line });
    log(line.text === "" ? "guide: no steps for what is on his screen; no card" : `guide: next on "${page!.title}", ${line.n} of ${line.of}: ${line.text}`);
  }

  return {
    /** The kept page now on his screen, or null. Gives it back, so it can sit where the page is found. */
    on(now: KeptPage | null): KeptPage | null {
      const changed = now?.name !== page?.name;
      page = now;
      if (changed) tell();
      return now;
    },
    /** Something was seen to happen on the page on his screen. */
    noted(what: Noted) {
      if (page === null) return;
      seen.set(page.name, note(seen.get(page.name) ?? nothingYet, what));
      tell();
    },
  };
}
