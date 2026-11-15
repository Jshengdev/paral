import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Hands } from "./ask.ts";
import { asksFor, saysOnly } from "./cores/catch.ts";
import { notesPage } from "./cores/notes.ts";
import type { KeptPage } from "./cores/page.ts";
import { cutOut, notesOf, placeOf } from "./cores/sitting.ts";
import type { Ahead } from "./glance.ts";
import { whereIs, type Where } from "./place.ts";
import { sayLine } from "./speech.ts";
import { SEAM_VERSION, type FromBody } from "../seam/schema.ts";

const v = SEAM_VERSION;
type Look = Extract<FromBody, { type: "look" }>;

/** The one file the notes are written to, in the temporary folder: the only page the app opens in his browser (`Keep.open`). */
export const notesFile = "lost-and-found-notes.html";
/** The repo's own DialKit, linked from the page by its place on this Mac; with it missing the page reads the same. */
const dialkit = pathToFileURL(join(import.meta.dirname, "..", "dials", "vendor", "dialkit")).href + "/";

/** What the rest of the mind holds for the sitting, read when the notes are made. */
export type Held = { ahead(): Ahead[]; kept(): string[]; walked(): string[]; whereNow(): { where: Where; page: KeptPage } | null };

/**
 * The notes of a sitting, for one connection: what he takes away at the end. When he says or taps "show me my notes"
 * (`notesAsks`), one page is written into the temporary folder from what the mind already holds, and the body is
 * told to open it; he hears one fixed line. No model is asked. The page holds his first question in his own words,
 * every step the looks found in order with its date, where it is and the kept page's own line, which are done (a date
 * he kept, a step of the walk he passed), what could not be told, and for a step whose section paral marked on his
 * screen, a cut-out of that section from the look's picture. With nothing found yet he is told so, and no page is written.
 */
export function notes(hands: Hands, held: Held) {
  const { ports, settings, send, log } = hands;
  let goal: string | null = null;
  /** The cut-out of each step's section, by its words; `own` when it shows the step's own line and not only its heading. */
  const pictures = new Map<string, { file: string; own: boolean }>();
  let latest: Look | null = null;

  return {
    /**
     * A look came, and the looks are acting on it (`taken`). Once they have, each step on the page whose line or
     * heading is where paral's mark now is gets that section cut from this look's picture. The picture is overwritten
     * by the next look, so nothing is cut when another look has come meanwhile. A cut of a step's own line is not
     * replaced by one of its heading alone.
     */
    async looked(look: Look, taken: void | Promise<void>): Promise<void> {
      latest = look;
      await taken;
      const now = held.whereNow();
      if (latest !== look || ports.cutter === null || now === null || now.where.box === null) return;
      for (const step of held.ahead().filter((each) => each.from === now.page.url)) {
        const placed = placeOf(step, now.page);
        const where = placed === null ? null : whereIs(settings, look, now.page, placed);
        if (!where?.box || where.on !== now.where.on || (pictures.get(step.step)?.own && !where.inView)) continue;
        const part = cutOut(where.box, look.display, look.picture, settings.notesCut.value);
        if (part === null) continue;
        const file = `lost-and-found-cut-${createHash("sha256").update(step.step).digest("hex").slice(0, 10)}.jpg`;
        const cut = await ports.cutter.cut({ from: look.picture.path, read: { w: look.picture.w, h: look.picture.h }, part, to: join(tmpdir(), file) }).catch(() => false);
        if (cut) pictures.set(step.step, { file, own: where.inView });
        log(cut ? `the section of "${step.step}" under "${where.on}" is cut from the look's picture for his notes` : `the section of "${step.step}" could not be cut; his notes leave its picture out`);
      }
    },

    /** Whether his words asked for his notes. If so it is done here, to the last sound. Else his first question is kept as the sitting's goal. */
    async asked(id: string, words: string, signal: AbortSignal, at: number): Promise<boolean> {
      if (!asksFor(words, settings.notesAsks.value)) {
        if (goal === null && !saysOnly(words, settings.showMeAsks.value)) goal = words;
        return false;
      }
      const shown = Object.fromEntries([...pictures].map(([step, picture]) => [step, picture.file]));
      const made = notesOf({ goal, ahead: held.ahead(), pages: ports.pages, kept: held.kept(), walked: held.walked(), pictures: shown, today: new Date(at) });
      if (made === null) {
        log(`${id}: he asked for his notes and no step has been found in this sitting; he is told, and no page is written`);
        await sayLine(hands, id, settings.nothingForNotesLine.value, signal);
        return true;
      }
      const path = join(tmpdir(), notesFile);
      writeFileSync(path, notesPage(made, { sheets: [], dialkit }));
      send({ v, type: "open", id, path, label: settings.notesLabel.value });
      const count = (what: number, one: string) => `${what} ${one}${what === 1 ? "" : "s"}`;
      log(`${id}: he asked for his notes: ${count(made.items.length, "step")}, ${made.items.filter((item) => item.done !== null).length} done, ${count(made.items.filter((item) => item.picture !== null).length, "picture")}, ${count(made.couldNotTell.length, "thing")} it could not tell; written to the temporary folder, and the body is told to open it`);
      await sayLine(hands, id, settings.notesLine.value, signal);
      return true;
    },
  };
}
