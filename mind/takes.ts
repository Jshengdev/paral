import type { Hands } from "./ask.ts";
import { asksFor } from "./cores/catch.ts";
import type { KeptPage } from "./cores/page.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
const short = (page: KeptPage) => page.title.split(" - ")[0].trim();

/**
 * "Take me there", for one connection. When an answer sends him to another of USC's kept pages, a card offers to
 * take him: pressed, or said, the app is asked to open that page's own address in his browser. Nothing is clicked,
 * scrolled or typed in his apps; a page is opened, as a link would open it. No model is asked. The look on the new
 * page is then for what he was sent for, as after any answer.
 */
export function takes(hands: Hands) {
  const { settings, send, log } = hands;
  /** The page the last answer sent him to; null until one has. */
  let to: KeptPage | null = null;

  return {
    /** An answer sent him to this page (null: to none). The offer is shown on a card of its own, not spoken. */
    sent(id: string, page: KeptPage | null) {
      if (page === null) return;
      to = page;
      const offer = settings.goOffer.value;
      send({ v, type: "say", id: `${id}o`, beat: 0, text: offer.line.replace("{page}", short(page)), offer: { label: offer.label, send: offer.send } });
      send({ v, type: "mute", id: `${id}o`, why: "an offer is shown on its card, not spoken" });
      log(`${id}: the answer sent him to "${page.title}"; a card offers to take him there`);
    },
    /** Whether his words asked to be taken there, with a page to go to. If so the app is asked to open it and he is told. */
    async asked(id: string, words: string, signal: AbortSignal): Promise<boolean> {
      if (to === null || !asksFor(words, settings.goAsks.value)) return false;
      send({ v, type: "go", id, url: to.url, label: short(to) });
      log(`${id}: he asked to be taken there; the app is asked to open ${to.url}`);
      await sayLine(hands, id, settings.goingLine.value.replace("{page}", short(to)), signal);
      return true;
    },
  };
}
