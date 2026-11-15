import type { Hands } from "./ask.ts";
import { asksFor } from "./cores/catch.ts";
import { away } from "./cores/dates.ts";
import { dateLine } from "./cores/keep.ts";
import type { KeptPage } from "./cores/page.ts";
import type { After, Where } from "./place.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
const short = (page: KeptPage) => page.title.split(" - ")[0].trim();

/** Where the thing now pointed at is on his screen, and the kept page it is on (`glance.ts` `whereNow`); null when nothing is pointed at. */
export type WhereNow = () => { where: Where; page: KeptPage } | null;

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
 *
 * "Open it for me": when paral's box is on a heading that is closed over the thing, the app is asked to click once
 * on that heading. Only that: a heading paral has itself marked on a kept page, which the kept page writes with its
 * + sign. With no such box up he is told so, and nothing is clicked.
 */
export function takes(hands: Hands, whereNow: WhereNow = () => null, kept: (line: string) => boolean = () => false) {
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
        const where = whereNow()?.where ?? null;
        const way = where !== null && where.box === null && where.to !== null ? { to: where.to, toward: where.toward } : null;
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
      if (asksFor(words, settings.openAsks.value)) {
        // The one click paral ever asks the app to make. Every condition for it is here, and all must hold:
        //   1. he asked for it, in his own words or by the card's button (the line above);
        //   2. his screen is one of USC's kept pages, read from an https address of a usc.edu site;
        //   3. the place is where paral's own last look put its box, not a place taken from his words or the model's;
        //   4. that place is a heading the kept page writes as one that opens (its + sign), closed over the thing.
        // The click is one press of the left button at the middle of that box. Nothing else is ever clicked or typed.
        const now = whereNow();
        const usc = now !== null && /^https:\/\/([a-z0-9-]+\.)*usc\.edu\//.test(now.page.url);
        if (now === null || !usc || !now.where.opens || now.where.box === null) {
          log(`${id}: he asked for it to be opened and paral's box is on no closed heading of a kept USC page; he is told, and nothing is clicked`);
          await sayLine(hands, id, settings.nothingToOpenLine.value, signal);
          return true;
        }
        const { x, y, w, h } = now.where.box;
        send({ v, type: "press", id, x: x + w / 2, y: y + h / 2, on: now.where.on ?? now.where.toward });
        send({ v, type: "state", name: "idle" });
        log(`${id}: he asked for the closed section to be opened; the app is asked to click once on "${now.where.on ?? now.where.toward}", the heading paral has boxed on "${now.page.title}"`);
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
