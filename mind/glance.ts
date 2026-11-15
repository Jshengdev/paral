import type { Hands, Screen } from "./ask.ts";
import { locate } from "./cores/ground.ts";
import { whichPage } from "./cores/page.ts";
import type { Glanced } from "./ports.ts";
import { SEAM_VERSION, type FromBody } from "../seam/schema.ts";

const v = SEAM_VERSION;
type Look = Extract<FromBody, { type: "look" }>;
const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** One thing still ahead for him, as found on a kept page: what, by when as the page writes it, and the page's address. */
export type Ahead = { step: string; by: string; from: string };

/**
 * The looks paral takes without being asked, for one connection. A look does something only when his screen is one
 * of USC's kept pages. The first time a page is seen, the deep model is asked about the kept page's own text:
 * whether it holds one thing that will cost him later. Nothing read from his screen is sent for that. If it does,
 * the line is marked where it is on his screen now (the line itself, or the heading it sits under), one sentence is
 * shown in the capsule with the trail of what was done, and what is still ahead is drawn as a board. It is shown,
 * not spoken. When he scrolls or opens a section the mark moves to where the thing now is.
 */
export function glances({ ports, settings, send, log }: Hands, remember: (ahead: Ahead[]) => void) {
  /** What each kept page was found to hold, so a page is asked about once. Null: nothing that will cost him later. */
  const found = new Map<string, Glanced | null>();
  /** What the mark of the last look sits on ("" when it had none), so the same thing is not shown twice. */
  let shown: string | null = null;
  let looks = 0;
  let running: AbortController | null = null;

  return {
    /** A press of the key ends a look in progress; what it had shown is his to ask about now. */
    stop() {
      running?.abort();
      running = null;
      shown = null;
    },
    async take(look: Look | Screen) {
      const page = whichPage(look.lines.map((line) => line.text), ports.pages, settings.pageLeastLines.value);
      if (page === null || ports.glancer === null) return;
      running?.abort();
      const mine = new AbortController();
      running = mine;
      const id = `g${++looks}`;
      const first = !found.has(page.name);
      if (first) {
        log(`${id}: an unasked look: his screen is the kept page "${page.title}". Nothing read from his screen leaves the Mac for it: the deep model is asked about the kept page's own text`);
        const glanced = await ports.glancer.glance(page, look.at, mine.signal).catch((error) => {
          if (!mine.signal.aborted) log(`${id}: the look failed (${error instanceof Error ? error.message : error}); nothing is shown`);
          return undefined;
        });
        if (mine.signal.aborted || glanced === undefined) return;
        found.set(page.name, glanced);
        if (glanced === null) return log(`${id}: the page holds nothing that will cost him later; nothing is shown`);
        remember(glanced.ahead.map((step) => ({ ...step, from: page.url })));
      }
      const glanced = found.get(page.name);
      if (!glanced) return;
      // Where the thing is on his screen now: the line itself when it is in view, or the heading it sits under. A
      // kept line can be a whole paragraph where his screen breaks it into several, so the screen's line that the
      // kept one begins with counts as the line.
      const begins = look.lines.find((read) => plain(read.text).length >= 12 && plain(glanced.line).startsWith(plain(read.text)));
      const line = locate(begins?.text ?? glanced.line, look.lines, look.display, settings.groundMinScore.value);
      const heading = glanced.under === "" ? null : locate(glanced.under, look.lines, look.display, settings.groundMinScore.value);
      const target = line.found ? line : heading?.found ? heading : null;
      const on = target?.line ?? "";
      if (on === shown) return;
      shown = on;
      send({ v, type: "clear" });
      if (target) send({ v, type: "mark", id, beat: 0, kind: "box", box: target.box });
      const trail = first ? ["saw this page", `read ${ports.pages.length} USC pages`, "found 1 date"] : ["saw this page", line.found ? "found the line" : "found where it is"];
      send({ v, type: "say", id, beat: 0, text: line.found ? glanced.sayInView : glanced.say, trail });
      send({ v, type: "mute", id, why: "a look he did not ask for is shown, not spoken" });
      // What is ahead stays drawn while he is on this page: it is sent again each time the mark moves.
      if (glanced.ahead.length > 0) send({ v, type: "board", id, rows: [glanced.ahead.map((step) => (step.by ? `${step.step}: ${step.by}` : step.step))] });
      log(`${id}: shown without being asked: "${line.found ? glanced.sayInView : glanced.say}"; the mark is on ${target ? `"${target.line}"` : "nothing, since neither the line nor its heading is in view"}`);
    },
  };
}
