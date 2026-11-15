import type { Setting } from "./types.ts";

/** Settings for the quick line and the other fast lines said while the deep answer is worked out. */
export const opener = {
  openerModel: {
    value: "claude-haiku-5-5",
    why: "The quick line is one short line said as he lets go, while the answer is being worked out, so it uses the small fast model. It may name the thing on his page that matters and never the result: the owner's choice on 2026-11-14 at 16:52, the way the earlier project this follows does it. The deep model is told the line word for word.",
    measured: "one live call: the opener came back in 1,260 ms (2026-11-14, one run)",
  } satisfies Setting<string>,

  openerMaxTokens: {
    value: 1000,
    why: "The most the fast model may write for its one line of about ten words. The cap is far above that so a line is never cut, and low enough that a runaway reply ends quickly.",
    measured: "not measured; no opener has come near it",
  } satisfies Setting<number>,

  openerEffort: {
    value: "low",
    why: "The quick line names an act and the thing on the page it is about. It needs no working out, and he is waiting.",
    measured: "not compared with other efforts",
  } satisfies Setting<"low" | "medium" | "high">,

  openerPageLines: {
    value: 40,
    why: "How many of the lines read from his screen the fast model is given. Enough to see what the page is; fewer lines mean a faster first word.",
    measured: "not measured; the exam's pages have 12 to 30 read lines",
  } satisfies Setting<number>,

  openerMaxWords: {
    value: 12,
    why: "A quick line longer than this is not said, and the fixed line stands in. While a long line is spoken, the answer waits behind it. Twelve is the owner's choice with the quick line itself.",
    measured: "one live run: a 22-word opener restated his question and held the first sentence back (2026-11-14)",
  } satisfies Setting<number>,

  openerDraftEveryMs: {
    value: 300,
    why: "While he talks, the quick line is drafted from his words so far, at most this often. At the release the newest draft is said at once if it still fits his final words. The ear's words arrive about every 0.5 to 1 s, so at 300 every arrival gets a draft; the floor only stops a burst.",
    measured: "one live run without drafting: the opener came 1.2 s after the release; an earlier project of ours drafts its first line as he talks and heard it 168 to 604 ms after the send. At 600, one live ask skipped the draft that would have been ready (its words came 597 ms after the draft before), and no line was ready at the release in 5 of 7 first asks (2026-11-14)",
  } satisfies Setting<number>,

  openerDraftShare: {
    value: 0.8,
    why: "A draft made from the start of his sentence is used when it covers at least this share of his final words. The quick line names the thing on his page that matters, and that thing is often named at the end of the question, so a draft from much less than the whole can name the wrong one.",
    measured: "15 recorded asks (2026-11-14): the last early draft was a clean start of his final words in 14; it covered 0.8 of them in 9 and 0.6 of them in 14. At 0.6, one live ask (\"Where on this page do I find the paid university holidays?\") got a quick line drafted from its first words that named the fall term dates, and the answer began \"Actually,\"; that is why it is 0.8. Not yet counted live at 0.8",
  } satisfies Setting<number>,

  openerDraftWords: {
    value: 3,
    why: "The opener is not drafted from fewer words than this, since there is nothing to name yet.",
    measured: "not measured",
  } satisfies Setting<number>,

  openerDeadlineMs: {
    value: 800,
    why: "The latest moment after the true release (his finger lifting) at which first words may be sent. If no quick line is written by then, the fixed line is said first and the quick line follows if it comes within openerWaitMs. Its reason: first words he can see and hear inside one second of the release (Nielsen's limit for keeping the train of thought), less the voice's first sound (95 to 124 ms measured), less a margin.",
    measured: "the fast model's first line took 0.25 to 2.5 s over nine live scenarios. At 1,000 the fixed line went out 1,002 to 1,009 ms after the true release in five asks, a few ms over the bar before any sound (2026-11-14, the outside judge, on the true clock). An ask that uses a finished early draft has first words at about 450 ms",
  } satisfies Setting<number>,

  openerWaitMs: {
    value: 1500,
    why: "After the fixed line has stood in at the deadline, the quick line is still waited for until this long after the release, and said when it comes; the deep model's call waits with it, so that it can be told the line. Past this the answer is asked without it and a quick line that arrives is never said. The same wait, 1.5 s, as the earlier project this follows, where the owner chose that the deep model waits for the draft.",
    measured: "51 asks of the fast model on the recorded pages: its line took a median of 0.84 s and at the slowest 1.75 to 2.4 s, so one asked afresh at the ear's final words (about 0.43 s after the release) is written by about 1.3 s in most asks and misses the 0.8 s deadline in nearly all (2026-11-14). How often the wait is used, and what it costs the answer, are in the notes of that day",
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
};
