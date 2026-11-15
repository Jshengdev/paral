import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Hands } from "./ask.ts";
import { asksFor } from "./cores/catch.ts";
import { calendarFile, dateLine, when, type ToKeep } from "./cores/keep.ts";
import type { KeptPage } from "./cores/page.ts";
import { speech } from "./speech.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;

/**
 * "Add it to my calendar", for one connection. "It" is the date paral last showed him, from a look or from an
 * answer. That date is written into a calendar file with the line as the page writes it and the page's address, and
 * the body is told to open the file. No model is asked and nothing but the sentence said leaves the Mac. With no date
 * to keep, or a line that names no day, he is told so.
 */
export function keeps(hands: Hands) {
  const { settings, send, log } = hands;
  let last: ToKeep | null = null;

  return {
    /** A look showed him this date. */
    found(date: ToKeep) {
      last = date;
    },
    /** An answer was given: a date in it that a kept page writes becomes the one to keep. `pages` has his screen's page first. */
    answered(told: string[], pages: KeptPage[]) {
      last = dateLine(told.join(" "), pages) ?? last;
    },
    /** Whether his words asked to keep the date. If so it is done here, to the last sound, and nothing else is asked. */
    async asked(id: string, words: string, at: number, signal: AbortSignal): Promise<boolean> {
      if (!asksFor(words, settings.keepAsks.value)) return false;
      const today = new Date(at);
      const day = last === null ? null : when(last.written, today);
      const file = last === null ? null : calendarFile({ ...last, today });
      let line = settings.nothingToKeepLine.value;
      if (last !== null && day !== null && file !== null) {
        const path = join(tmpdir(), "lost-and-found-keep.ics");
        writeFileSync(path, file);
        send({ v, type: "open", id, path });
        line = settings.keptLine.value.replace("{date}", new Date(day.year, day.month - 1, day.day).toLocaleDateString("en-US", { month: "long", day: "numeric" }));
        log(`${id}: he asked to keep a date; a calendar file was written for "${last.written.slice(0, 80)}" from ${last.url}, and the body is told to open it`);
      } else {
        log(`${id}: he asked to keep a date and there is none to keep${last === null ? "" : ` (the line names no day: "${last.written.slice(0, 80)}")`}`);
      }
      const talk = speech(hands, id, signal);
      send({ v, type: "say", id, beat: 0, text: line });
      talk.speak(0, line);
      await talk.finished();
      if (!signal.aborted) send({ v, type: "state", name: "idle" });
      return true;
    },
  };
}
