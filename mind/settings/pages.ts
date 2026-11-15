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

  keepAsks: {
    value: ["add … to my calendar", "add … to calendar", "put … in my calendar", "put … on my calendar", "save the date"],
    why: "Words of his that ask to keep the date paral last showed him. No model is asked: the date is written into a calendar file with the page's address, and the Mac opens the file in his calendar app.",
    measured: "not measured; a first list",
  } satisfies Setting<string[]>,

  keptLine: {
    value: "{date} is open in your calendar.",
    why: "What he hears and sees when the calendar file has gone out. {date} is the month and day read from the page's line. It claims no more than that the file was opened: paral clicks nothing in the calendar.",
    measured: "not seen live: whether Calendar asks before adding the entry or adds it at once has not been seen on a Mac",
  } satisfies Setting<string>,

  nothingToKeepLine: {
    value: "I have not found a date to keep on this page.",
    why: "Said when he asks to keep a date and no look has found one, or the line it found names no day.",
    measured: "not seen live",
  } satisfies Setting<string>,

  goOffer: {
    value: { line: "That is on the {page} page. Want me to take you there?", label: "Take me there", send: "take me there" },
    why: "After an answer that sends him to another of USC's kept pages: the one line on the card ({page} is the page's name), its button's words, and the words the button sends back, which are also what he can say. One sentence and one offer, never a paragraph.",
    measured: "not seen on a real screen",
  } satisfies Setting<{ line: string; label: string; send: string }>,

  goAsks: {
    value: ["take me there", "take me to it", "take me to that page", "yes take me", "go there", "open that page", "open it for me"],
    why: "Words of his that ask to be taken to the page the last answer sent him to. They count only when an answer has named such a page; otherwise they are an ordinary ask.",
    measured: "not measured; a first list",
  } satisfies Setting<string[]>,

  goingLine: {
    value: "Opening the {page} page.",
    why: "What he hears and sees when the app is asked to open a page for him.",
    measured: "not heard live",
  } satisfies Setting<string>,

  showMeAsks: {
    value: ["show me", "show me the way", "show me what to do", "show me what's next", "show me what is next", "show me the next step", "show me the next one", "show me next", "what's next", "what is next", "next step"],
    why: "His whole words, and nothing more, that start or move on the walk through what is ahead. A question that only begins this way (\"show me where to book a room\") is an ordinary ask.",
    measured: "not measured; a first list. One live run heard \"Show me.\" as said",
  } satisfies Setting<string[]>,

  markTags: {
    value: true,
    why: "Whether a mark on the thing's own line gets more than its ring: a date still ahead gets a tag with the count (\"7 days left\"), a deadline that has passed is struck through with a quiet tag (\"closed 13 days ago\"), the step of a walk he is on gets \"Next\" and the steps behind him a tick and \"Done\". The counts are worked out by the calendar here, never by a model.",
    measured: "not seen on a real screen",
  } satisfies Setting<boolean>,

  walkTags: {
    value: { next: "Next", done: "Done" },
    why: "The words on the tags of a walk: on the step he is on, and on the steps behind him.",
    measured: "not measured",
  } satisfies Setting<{ next: string; done: string }>,

  movedLeast: {
    value: 6,
    why: "A marked line whose box is this many points or more from where it was, across or down, has moved: the mark is drawn again where the line now is. Less than that is taken as the text reader's own wobble between two pictures, and what is shown stays.",
    measured: "not measured on a real screen: how far the reader's boxes wobble between two pictures of a still page is not known",
  } satisfies Setting<number>,

  unaskedVoice: {
    value: true,
    why: "Whether the first look at a page is also said aloud when it shows a date, ahead or passed: once for the page in a sitting, never while he holds the key or an answer is on its way, and stopped by a press of the key. A look that only moves its mark is never spoken. The owner's word at about midnight on 2026-11-15: \"yes it should speak the unasked line aloud\".",
    measured: "not heard on a Mac",
  } satisfies Setting<boolean>,

  clickGrow: {
    value: 10,
    why: "A click this many points outside the box of the step he is on still counts as a click on it, so the box's own edge counts. A click there is the step done: the walk moves on as if he had said \"show me\" again.",
    measured: "not measured on a Mac; ten is the reach the idea window's study of another guide found it gives its ring",
  } satisfies Setting<number>,

  showMeLine: {
    value: "Step {n} of {of}: {step}{by}.",
    why: "What he hears and sees for the step he is on. {step} is the step in the words the look found it in, and {by} is \", by\" and its date as the page writes it, or nothing when the page gives none.",
    measured: "not measured",
  } satisfies Setting<string>,

  showMeElsewhere: {
    value: " It is on the page {page}.",
    why: "Added to the step's sentence when the step was found on a kept page that is not the one on his screen. paral clicks nothing; when he gets there the looks place the step.",
    measured: "not seen live",
  } satisfies Setting<string>,

  showMeDoneLine: {
    value: "That was the last step I found.",
    why: "Said when he says \"show me\" after the last step. The next one starts again from the first.",
    measured: "not seen live",
  } satisfies Setting<string>,

  followForMs: {
    value: 180000,
    why: "For this long after an answer, a look at another kept page is taken as him following that answer: it looks for what he was sent there for, and for nothing else. It is how paral guides from page to page. After it, a new page is looked at afresh.",
    measured: "not measured; three minutes is a guess at how long a click and a page load can take in a demo",
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

  leftOutLine: {
    value: "I left out part of that: it named a date I could not find on a page I have read.",
    why: "Said after an answer when some of its sentences, not all, were held back for naming a date that is on no page paral has read. Without it the sentences left can sound like the whole answer.",
    measured: "not seen live",
  } satisfies Setting<string>,

  pageLinesGiven: {
    value: 170,
    why: "At most this many lines of each kept page are given to the deep model: the page on his screen with its closed sections, then the other kept pages of the same site. It is what lets paral say a date or a step that is not on the screen. More lines cost time on every ask.",
    measured: "the club recognition page is 162 lines, about 5,500 tokens; the time it adds to an answer is in the notes of 2026-11-14",
  } satisfies Setting<number>,
};
