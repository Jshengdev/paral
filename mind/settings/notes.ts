import type { Room } from "../cores/sitting.ts";
import type { Setting } from "./types.ts";

/** Settings for the notes of a sitting: the page he takes away, with every step in order and where to find it. */
export const notes = {
  notesAsks: {
    value: ["my notes", "show me the notes", "open the notes", "side notes", "action items"],
    why: "Words of his that ask for the notes of this sitting: every step the looks found, in order, with its date, where it is, the page's own line and a cut-out picture of its section, written as one page and opened in his browser. No model is asked. The owner, after his first real run: \"I wasnt able to udnerstand the whole flow of the resgistiraiotn process and want to properly end with like a side notes documetn that contain all the action items i need to do and in order and how to find there with a cut out screenhsot of that seciton to hover and view at the end of the session\". The menu's bank ends each scenario with \"show me my notes\" (cueCards).",
    measured: "not measured; a first list",
  } satisfies Setting<string[]>,

  notesLine: {
    value: "Your notes are open in your browser.",
    why: "What he hears and sees when the notes page has been written and the app told to open it. Short and fixed: the page says the rest, and no model is asked.",
    measured: "not seen on a Mac: the page has never been opened by the app",
  } satisfies Setting<string>,

  nothingForNotesLine: {
    value: "There is nothing for your notes yet. Open a USC page I have read and I will find the steps.",
    why: "Said when he asks for his notes and no look has found a step on a kept page in this sitting: no page is written and nothing is opened.",
    measured: "not seen live",
  } satisfies Setting<string>,

  notesLabel: {
    value: "your notes",
    why: "The `open` line's label for the notes page: the app's toast reads it after \"Opening\".",
    measured: "not seen on a Mac",
  } satisfies Setting<string>,

  notesCut: {
    value: { above: 24, below: 150, side: 24, least: 520 },
    why: "The room kept round a box paral marked when its section is cut out of the look's picture for the notes, in screen points: a little above the line or heading, most of a section below it, and never narrower than about a column of text, so a heading alone still shows what sits under it.",
    measured: "not measured: a first guess from the club page's layout on a 1728-point display; no cut has been seen on a real look's picture",
  } satisfies Setting<Room>,
};
