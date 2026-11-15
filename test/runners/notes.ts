// Runners for rows about the notes of a sitting: the page (`cores/notes.ts`), what goes on it (`cores/sitting.ts`),
// and the part of a look's picture cut for a marked section.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { notesPage, type Item, type Notes } from "../../mind/cores/notes.ts";
import { cutOut, notesOf, scaled } from "../../mind/cores/sitting.ts";
import { sips } from "../../mind/adapters/sips.ts";
import { fresh } from "./temp.ts";

const headless = join(import.meta.dirname, "..", "..", "body", ".build", "debug", "paral-headless");
const where = { page: "Recognition Process - Campus Activities", url: "https://example.edu/page", section: "Deadlines" };
const item = (todo: string, more: Partial<Item> = {}): Item => ({ todo, due: null, where, quote: "The page says so.", picture: null, done: null, ...more });
const notes = (items: Item[], more: Partial<Notes> = {}): Notes => ({ title: "Notes", goal: "what do we need?", made: "November 15, 2026", items, couldNotTell: ["How long the trainings take."], ...more });

/** The page, read for what a row checks: each case's items given in, and what the page made of them. */
export const notesRuns = {
  "notes.page": () => {
    const ordered = notesPage(notes([item("First thing"), item("Second thing"), item("Third thing")]));
    const at = ["First thing", "Second thing", "Third thing"].map((text) => ordered.indexOf(text));
    const doneOne = notesPage(notes([item("Open", { due: { asWritten: "November 22", left: "7 days left" } }), item("Shut", { done: "in your calendar", due: { asWritten: "December 1", left: "16 days left" } })]));
    const hostile = notesPage(notes([item("<script>alert(1)</script>", { quote: '"><img src=x onerror=alert(1)>', where: { ...where, url: "javascript:alert(1)" } })], { couldNotTell: ["<b>bold</b>"] }));
    const pictured = notesPage(notes([item("Picture", { picture: "lost-and-found-cut-1.jpg" })]));
    const bare = notesPage(notes([item("No quote, no section", { quote: "", where: { ...where, section: "" } })], { goal: null, couldNotTell: [] }));
    return {
      inOrderAndNumbered: at.every((i) => i > 0) && [...at].sort((a, b) => a - b).join() === at.join() && ordered.includes('<span class="n">3</span>'),
      doneSaysWhyAndLosesItsDate: /<li class="item done">.*Shut.*<span class="chip quiet">in your calendar<\/span>/s.test(doneOne) && !doneOne.includes("December 1 ·"),
      dateWithDaysLeft: doneOne.includes("November 22 · 7 days left"),
      countsDone: doneOne.includes("2 things to do, in this order · 1 done"),
      scriptIsText: !hostile.includes("<script>alert(1)") && hostile.includes("&lt;script&gt;alert(1)&lt;/script&gt;"),
      noInjectedTags: !hostile.includes("<img src=x") && !hostile.includes("<b>bold</b>") && !hostile.includes("javascript:"),
      noPictureNoImage: !/<img/.test(ordered) && !/<img/.test(notesPage(notes([item("Bad picture", { picture: "javascript:alert(1)" })]))),
      aPictureIsSmallAndBig: pictured.match(/<img[^>]*src="lost-and-found-cut-1.jpg"/g)?.length ?? 0,
      couldNotTellUnderItsHeading: /What Lost and Found could not tell you<\/h2><ul><li>How long the trainings take.<\/li><\/ul>/.test(ordered),
      noGoalNoQuoteNoSection: !bare.includes("You asked") && !bare.includes("<blockquote>") && !bare.includes(", under") && bare.includes("Nothing left open."),
      standsAloneWithNoLinks: !/<link|<script src/.test(ordered),
      dialkitWhenLinked: notesPage(notes([]), { sheets: [], dialkit: "kit/" }).includes('<script src="kit/browser.global.js">'),
    };
  },
  "notes.of": (input: any) => input.sittings.map((sitting: any) => {
    const made = notesOf({ ...sitting, today: new Date(sitting.today) });
    return made === null ? null : { ...made, items: made.items.map((each) => `${each.done === null ? "[ ]" : `[${each.done}]`} ${each.todo}${each.due ? ` · ${each.due.asWritten} · ${each.due.left}` : ""} · ${each.where.page}${each.where.section ? ` > ${each.where.section}` : ""} · "${each.quote}"${each.picture ? ` · ${each.picture}` : ""}`) };
  }),
  "notes.cut": (input: any) => input.cases.map(([box, display, read, copy]: any[]) => {
    const part = cutOut(box, display, read, input.room);
    return { part, inCopy: part === null ? null : scaled(part, read, copy) };
  }),
  /**
   * Whether the app would open each path as his notes page (`Keep.notes`): the files are made in a folder
   * of the row's own that stands for the temporary folder, by their place there; the notes page is first asked for while it is not there.
   */
  "body.notesOpen": (input: { paths: string[] }) => {
    const folder = fresh("notes-open");
    mkdirSync(folder, { recursive: true });
    const notes = join(folder, "lost-and-found-notes.html");
    const missing: boolean[] = JSON.parse(execFileSync(headless, ["notes", folder, notes], { encoding: "utf8" }));
    const paths = input.paths.map((path) => `${folder}/${path}`);
    for (const path of paths) mkdirSync(join(path, ".."), { recursive: true });
    for (const path of paths) writeFileSync(path, "<!doctype html>");
    const opens: boolean[] = JSON.parse(execFileSync(headless, ["notes", folder, ...paths], { encoding: "utf8" }));
    return { "the notes page, before it is written": missing[0], ...Object.fromEntries(input.paths.map((path, index) => [path, opens[index]])) };
  },
  /**
   * The live cutting port on a page drawn for the row: the page is drawn at the size the lines are read at, a smaller
   * copy is saved as the app saves a look's, the part for a box (in points, the display at 2x) is cut from the copy by
   * `sips`, and the cut is measured and read back.
   */
  "sips.cut": async (input: { lines: string[]; box: { x: number; y: number; w: number; h: number }; room: any; longEdge: number }) => {
    const [page, copy, cut] = [fresh("notes-page") + ".png", fresh("notes-copy") + ".jpg", fresh("notes-cut") + ".jpg"];
    const read = JSON.parse(execFileSync(headless, ["page", page, ...input.lines], { encoding: "utf8" })) as { w: number; h: number };
    execFileSync(headless, ["smaller", page, copy, String(input.longEdge)]);
    const part = cutOut(input.box, { x: 0, y: 0, scale: 2 }, read, input.room)!;
    const logged: string[] = [];
    const cutIt = await sips((line) => logged.push(line)).cut({ from: copy, read: { w: read.w, h: read.h }, part, to: cut });
    const size = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", cut], { encoding: "utf8" });
    const reads = (JSON.parse(execFileSync(headless, ["read", cut], { encoding: "utf8" })).lines as { text: string }[]).map((line) => line.text);
    const failed = await sips(() => {}).cut({ from: fresh("no-such-picture") + ".jpg", read, part, to: fresh("notes-none") + ".jpg" });
    return { part, cut: cutIt, size: [Number(/pixelWidth: (\d+)/.exec(size)?.[1]), Number(/pixelHeight: (\d+)/.exec(size)?.[1])], reads, logged, aMissingPictureIsNotCut: !failed };
  },
};
