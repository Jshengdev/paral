import type { Setting } from "./types.ts";

/** Settings for USC's pages read ahead of time (see `pages/`), and for what paral may say from them. */
export const pages = {
  pageLeastLines: {
    value: 3,
    why: "A kept page is taken to be the one on his screen when its text holds at least this many of the lines read from the screen (lines of 15 letters or more), and more than any other kept page holds. Fewer could be a menu or a heading two pages share.",
    measured: "not measured on a real window; on pages drawn from the kept text the page was found from its first screen each time (2026-11-14)",
  } satisfies Setting<number>,

  lookEveryMs: {
    value: 2500,
    why: "How often the body looks at the display with no key pressed. It sends a look to the mind only when what it read has changed since the last one it sent and then stood still for one round, so scrolling sends nothing until he stops. The mind acts on a look only when the screen is one of USC's kept pages. Zero turns the looks off.",
    measured: "not measured on a real window: how much of the Mac a look every 2.5 s costs is unknown",
  } satisfies Setting<number>,

  glanceMaxTokens: {
    value: 3000,
    why: "Room for the deep model's thinking and its short reply to a look he did not ask for: one line, two sentences and three steps at most.",
    measured: "not measured",
  } satisfies Setting<number>,

  noPageLine: {
    value: "I do not have that on a page I have read.",
    why: "Said when every sentence of an answer was held back for naming a date that is on no page paral has read, so the ask does not end in silence.",
    measured: "not seen live",
  } satisfies Setting<string>,

  pageLinesGiven: {
    value: 170,
    why: "At most this many lines of each kept page are given to the deep model: the page on his screen with its closed sections, then the other kept pages of the same site. It is what lets paral say a date or a step that is not on the screen. More lines cost time on every ask.",
    measured: "the club recognition page is 162 lines, about 5,500 tokens; the time it adds to an answer is in the notes of 2026-11-14",
  } satisfies Setting<number>,
};
