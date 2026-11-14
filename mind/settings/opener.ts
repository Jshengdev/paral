import type { Setting } from "./types.ts";

/** Settings for the fast lines said while the deep answer is worked out. */
export const opener = {
  openerModel: {
    value: "claude-haiku-5-5",
    why: "The opener is one short line said while the answer is being worked out, so it uses the small fast model.",
    measured: "one live call: the opener came back in 1,260 ms (2026-11-14, one run)",
  } satisfies Setting<string>,

  openerMaxTokens: {
    value: 1000,
    why: "The most the fast model may write for its two lines. They are about thirty words; the cap is far above that so a line is never cut, and low enough that a runaway reply ends quickly.",
    measured: "not measured; no opener has come near it",
  } satisfies Setting<number>,

  openerEffort: {
    value: "low",
    why: "The fast lines name an act and state one visible thing. They need no working out, and he is waiting.",
    measured: "not compared with other efforts",
  } satisfies Setting<"low" | "medium" | "high">,

  openerPageLines: {
    value: 40,
    why: "How many of the lines read from his screen the fast model is given. Enough to see what the page is; fewer lines mean a faster first word.",
    measured: "not measured; the exam's pages have 12 to 30 read lines",
  } satisfies Setting<number>,

  openerMaxWords: {
    value: 12,
    why: "An opener longer than this is not said. While a long opener is spoken, the answer waits behind it.",
    measured: "one live run: a 22-word opener restated his question and held the first sentence back (2026-11-14)",
  } satisfies Setting<number>,

  openerDraftEveryMs: {
    value: 600,
    why: "While he talks, the opener is drafted from his words so far, at most this often. At the release the newest draft is said at once if it still fits his final words.",
    measured: "one live run without drafting: the opener came 1.2 s after the release; an earlier project of ours drafts its first line as he talks and heard it 168 to 604 ms after the send",
  } satisfies Setting<number>,

  openerDraftShare: {
    value: 0.6,
    why: "A draft made from the start of his sentence is used when it covers at least this share of his final words; the opener only names the act, so the last few words rarely change it.",
    measured: "15 recorded asks (2026-11-14): the last early draft was a clean start of his final words in 14; it covered 0.8 of them in 9 and 0.6 of them in 14. At 0.8 the other five waited for a fresh call after the release",
  } satisfies Setting<number>,

  openerDraftWords: {
    value: 3,
    why: "The opener is not drafted from fewer words than this, since there is nothing to name yet.",
    measured: "not measured",
  } satisfies Setting<number>,

  openerDeadlineMs: {
    value: 800,
    why: "The latest moment after the true release (his finger lifting) at which first words may be sent. If no opener is out by then, the fixed line is said first and the model's own opener follows when it comes. Its reason: first words he can see and hear inside one second of the release (Nielsen's limit for keeping the train of thought), less the voice's first sound (95 to 124 ms measured), less a margin.",
    measured: "the fast model's first line took 0.25 to 2.5 s over nine live scenarios. At 1,000 the fixed line went out 1,002 to 1,009 ms after the true release in five asks, a few ms over the bar before any sound (2026-11-14, the outside judge, on the true clock). An ask that uses a finished early draft has first words at about 450 ms",
  } satisfies Setting<number>,

  stallAfterMs: {
    value: 1300,
    why: "While the answer has not begun: this long after the opener has been heard with nothing new said or drawn, the next fixed stall line is said. Once the answer's first fields have arrived only stallShort may be said: a full stall line begun a quarter-second after the first fields once held the first sentence back by about 1.5 s. The reason for the number: no more than two seconds from the end of one sound to the start of the next, less the voice's first sound and a margin. Zero turns the stall off.",
    measured: "with no stall, an opener ended 2.3 to 3.6 s after the release and the first deep sentence began at 4.6 to 7.1 s, across nine live scenarios (2026-11-14, the outside judge). The stall itself has a row and has not been judged live",
  } satisfies Setting<number>,

  stallLines: {
    value: ["Give me a moment to work it out.", "Still working through it.", "This one is taking me a little longer."],
    why: "The stall lines, said in this order, one each time the wait for the deep answer runs on. Fixed, so they can say nothing about his page, and none promises when the answer will come. Three cover an answer of about thirteen seconds.",
    measured: "one deep answer took 11.6 s; with a single stall line that left 5.1 s with nothing new (2026-11-14, the outside judge)",
  } satisfies Setting<string[]>,

  stallShort: {
    value: "One moment.",
    why: "The only stall line that may be said once the answer's first fields have arrived. Its first sentence is then close, so the line is kept under a second: that is the most it can hold the answer back.",
    measured: "the first sentence came 1.1, 1.3 and 1.95 s after the first fields in three live asks, leaving 2.1 to 2.9 s with nothing new after the opener (2026-11-14, the outside judge). The short line has a row and has not been judged live",
  } satisfies Setting<string>,

  openerFallback: {
    value: "Okay, let me look.",
    why: "Said when the opener's model fails or writes past openerMaxWords, so an ask is never left with no first words.",
    measured: "one dropped opener in nine live scenarios left 4.2 s with nothing said (2026-11-14, the outside judge)",
  } satisfies Setting<string>,

  openerInLesson: {
    value: "Okay, let's look at it again.",
    why: "The opener while a wrong line is open. It is fixed because the opener's model sees his page and once named the kind of mistake before the hint did (\"Let's find the step where the signs slip.\").",
    measured: "that leak was seen once in six live scenarios (2026-11-14, the outside judge)",
  } satisfies Setting<string>,

  surfaceMaxWords: {
    value: 12,
    why: "With its opener the fast model may give one line that states something anyone can read straight off the page. It is held until the deep answer says there is no wrong line, then said at once, so the wait for the first deep sentence is not silent. On a page with a wrong line it is never said: only the ladder speaks there. A line longer than this is dropped and the log says so, since a long one holds the answer back. Zero turns it off.",
    measured: "nine live scenarios (2026-11-14, the outside judge): said in 2 asks, dropped for length in 4 (19 to 38 words), not given in 3. One that was said took 6.1 s and held the answer back by 5 s; the limit was 16 words then",
  } satisfies Setting<number>,
};
