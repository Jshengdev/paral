import type { Hands } from "./ask.ts";
import { nextStep, note, nothingYet, towardGoal, type Noted, type Seen, type Toward } from "./cores/guide.ts";
import type { KeptPage } from "./cores/page.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/**
 * The guide, for one connection: for the kept page on his screen it tells the body what to do next, one step at a
 * time, and moves on when the mind sees the step happen. Until he has asked something on the page the steps are the
 * page's own list (`demoSteps`). The first thing he asks there is his goal, and from then the steps are the goal's:
 * the ones the looks found on that page (`ahead`), counted by the walk. It asks no model and watches nothing of its
 * own: it is told what the looks, the walk, the calendar step and the asks already know. A page with no steps gets
 * an empty line, which shows no card.
 */
export function guides({ settings, send, log }: Pick<Hands, "settings" | "send" | "log">, ahead: () => (Toward & { from: string })[] = () => []) {
  /** What has been seen to happen on each page, by the page's name. */
  const seen = new Map<string, Seen>();
  let page: KeptPage | null = null;
  /** The line the body was last sent, so the same one is not sent twice. */
  let told = "";

  function tell() {
    const steps = page === null ? undefined : settings.demoSteps.value[page.name];
    const so = page === null ? nothingYet : (seen.get(page.name) ?? nothingYet);
    const goal = page === null ? null : towardGoal(ahead().filter((step) => step.from === page!.url), so);
    const at = steps === undefined ? -1 : nextStep(steps, so);
    const done = { text: settings.demoDoneLine.value, done: true };
    const line =
      goal !== null ? (goal.past ? { ...done, n: goal.n, of: goal.of } : { text: goal.text, n: goal.n, of: goal.of })
      : steps === undefined ? { text: "", n: 0, of: 0 } : at < 0 ? { ...done, n: steps.length, of: steps.length } : { text: steps[at].text, n: at + 1, of: steps.length };
    if (JSON.stringify(line) === told) return;
    told = JSON.stringify(line);
    send({ v, type: "next", ...line });
    const whose = goal !== null ? `toward his goal "${so.asked[0]}"` : `next on "${page?.title}"`;
    log(line.text === "" ? "guide: no steps for what is on his screen; no card" : `guide: ${whose}, ${line.n} of ${line.of}: ${line.text}`);
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
