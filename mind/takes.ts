import type { Hands } from "./ask.ts";
import { asksFor } from "./cores/catch.ts";
import { away } from "./cores/dates.ts";
import { dateLine } from "./cores/keep.ts";
import type { KeptPage } from "./cores/page.ts";
import type { After } from "./place.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
const short = (page: KeptPage) => page.title.split(" - ")[0].trim();

/** Which way the thing now pointed at lies, when it is off his screen, and its name; null when no arrow is up. */
export type WayNow = () => { to: "up" | "down"; toward: string } | null;

/**
 * What paral does in his browser for him, on his word only, for one connection. No model is asked for either.
 *
 * After an answer on a kept page, the answer stays on a card with one offer (`sent`).
 *
 * "Take me there": when an answer sends him to another of USC's kept pages, a card offers to take him: pressed, or
 * said, the app is asked to open that page's own address in his browser, as a link would open it. The look on the
 * new page is then for what he was sent for, as after any answer.
 *
 * "Scroll for me": when an arrow says the thing is off his screen, the app is asked to scroll the page that way
 * until it comes into view. Nothing is said: the page moving is the answer, and the looks that come every second
 * while it moves put the mark on the thing as it arrives. With no arrow up he is told so, and nothing is scrolled.
 */
export function takes(hands: Hands, wayNow: WayNow = () => null, kept: (line: string) => boolean = () => false) {
  const { settings, send, log } = hands;
  /** The page the last answer sent him to; null until one has. */
  let to: KeptPage | null = null;

  return {
    /**
     * An answer was given on a kept page (`on`), at `at`: it stays on a card of its own, shown and not spoken, with
     * the one thing paral can do next. A page it sent him to: the offer to take him there, on its own line. Else the
     * answer's words, with the offer to scroll when its arrow is up; else to keep a date it named that is still
     * ahead and not yet kept; else to walk the steps, when some are known (`steps`).
     */
    sent(id: string, told: string[], on: KeptPage, at: number, after: After, steps: boolean) {
      if (told.length === 0) return;
      const card = settings.answerCard.value, said = told.join(" ");
      if (after.sent !== null) {
        to = after.sent;
        const offer = settings.goOffer.value;
        send({ v, type: "say", id: `${id}o`, beat: 0, text: offer.line.replace("{page}", short(after.sent)), offer: { label: offer.label, send: offer.send } });
        send({ v, type: "mute", id: `${id}o`, why: "an offer is shown on its card, not spoken" });
        return log(`${id}: the answer sent him to "${after.sent.title}"; a card offers to take him there`);
      }
      // As much of the answer as the card holds, cut at the end of a sentence; its first sentence whole, whatever its length.
      const text = told.reduce((kept, sentence) => (kept === "" || `${kept} ${sentence}`.length <= card.most ? `${kept} ${sentence}`.trim() : kept), "");
      const date = dateLine(said, [on]);
      const keep = !after.way && date !== null && !kept(date.written) && (away(date.written, new Date(at))?.days ?? -1) >= 0;
      const offer = after.way ? card.scroll : !keep && steps ? card.steps : null;
      send({ v, type: "say", id: `${id}o`, beat: 0, text, trail: card.trail, ...(keep ? { keep: true } : {}), ...(offer ? { offer } : {}) });
      send({ v, type: "mute", id: `${id}o`, why: "an answer's card is shown, not spoken" });
      log(`${id}: the answer stays on a card${after.way ? ", which offers to scroll to where it points" : keep ? ", which offers to keep the date it named" : offer ? ", which offers to walk the steps" : ""}`);
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
