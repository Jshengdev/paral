import type { Hands } from "./ask.ts";
import { asksFor } from "./cores/catch.ts";
import type { KeptPage } from "./cores/page.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
const short = (page: KeptPage) => page.title.split(" - ")[0].trim();

/** Which way the thing now pointed at lies, when it is off his screen, and its name; null when no arrow is up. */
export type WayNow = () => { to: "up" | "down"; toward: string } | null;

/**
 * What paral does in his browser for him, on his word only, for one connection. No model is asked for either.
 *
 * "Take me there": when an answer sends him to another of USC's kept pages, a card offers to take him: pressed, or
 * said, the app is asked to open that page's own address in his browser, as a link would open it. The look on the
 * new page is then for what he was sent for, as after any answer.
 *
 * "Scroll for me": when an arrow says the thing is off his screen, the app is asked to scroll the page that way
 * until it comes into view. Nothing is said: the page moving is the answer, and the looks that come every second
 * while it moves put the mark on the thing as it arrives. With no arrow up he is told so, and nothing is scrolled.
 */
export function takes(hands: Hands, wayNow: WayNow = () => null) {
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
      if (asksFor(words, settings.scrollAsks.value)) {
        const way = wayNow();
        if (way === null) {
          log(`${id}: he asked to be scrolled there and no arrow is up; he is told, and nothing is scrolled`);
          await sayLine(hands, id, settings.nothingToScrollLine.value, signal);
          return true;
        }
        send({ v, type: "scroll", id, to: way.to, toward: way.toward });
        // Nothing is said, so the ask ends here: the body is told it is over, as the last sentence of an answer would.
        send({ v, type: "state", name: "idle" });
        log(`${id}: he asked to be scrolled there; the app is asked to scroll ${way.to}, toward "${way.toward}", until it comes into view`);
        return true;
      }
      if (to === null || !asksFor(words, settings.goAsks.value)) return false;
      send({ v, type: "go", id, url: to.url, label: short(to) });
      log(`${id}: he asked to be taken there; the app is asked to open ${to.url}`);
      await sayLine(hands, id, settings.goingLine.value.replace("{page}", short(to)), signal);
      return true;
    },
  };
}
