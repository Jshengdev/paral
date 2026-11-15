import type { Hands, Screen } from "./ask.ts";
import { movedUnder, type KeptPage } from "./cores/page.ts";
import { point, whereIs, type After } from "./place.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/** What is on his screen, from a press of the key or from a look: the lines read and where the display is. */
type Seen = Pick<Screen, "lines" | "display">;

/**
 * What the looks do after an answer, for one connection. An answer is his: until his next answer, or a walk, the
 * looks of that page do not bring the page's own first thing back over it. A look then does one of two things. While the page has
 * not moved under the answer's marks, nothing: what he was shown stays, board and all. When it has (he scrolled, or
 * opened a section), the answer's marks would sit on the wrong lines, so everything drawn is wiped, and the place
 * the answer sent him to on this page, if it named one, is marked where it now stands, or the way to it. A look at
 * another kept page ends the hold: he has gone on.
 */
export function answered({ settings, send, log }: Hands) {
  /** The page the last answer was given on, his screen as the answer's marks were placed on it, and where it sent him. */
  let held: { page: string; seen: Seen; target: After["target"]; way: string | null } | null = null;
  let looks = 0;

  return {
    /** An answer was given on `page`, with his screen as it was read for it. Gives back where it sent him, as given. */
    pointed(page: string, seen: Seen, after: After): After {
      held = { page, seen, target: after.target, way: null };
      return after;
    },
    /** A walk has begun, which leads the looks from here: the answer before it no longer holds them. */
    stop() {
      held = null;
    },
    /** What the answer that holds this page's looks sent him to, if one holds them: null inside when it named no place. */
    on: (page: string) => (held !== null && held.page === page ? { target: held.target } : null),
    /** Whether an answer holds this look. If so it is dealt with here, and the page's own thing is not shown. */
    take(look: Seen, page: KeptPage): boolean {
      if (held === null) return false;
      if (held.page !== page.name) {
        held = null;
        return false;
      }
      const id = `a${++looks}`;
      if (!movedUnder(held.seen.lines, look.lines, settings.movedLeast.value * look.display.scale)) {
        log(`${id}: the page has not moved since his answer; what he was shown stays`);
        return true;
      }
      const where = held.target === null ? null : whereIs(settings, look, page, held.target);
      held.seen = look;
      // While he scrolls toward it the looks come every second: an arrow that still points the same way is left as
      // it is, and not wiped and drawn again each time.
      const way = where !== null && where.box === null && where.to !== null ? `${where.to}, toward "${where.toward}"` : null;
      if (way !== null && way === held.way) {
        log(`${id}: the page has moved and the place his answer sent him to is still ${way}; the arrow stays`);
        return true;
      }
      held.way = way;
      send({ v, type: "clear" });
      log(`${id}: the page has moved under his answer, so what was drawn for it is wiped; ${where === null ? "the answer pointed at no place on this page, and the page's own thing does not come back" : `the looks keep to where it sent him: ${point(send, id, where)}`}`);
      return true;
    },
  };
}
