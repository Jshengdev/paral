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
    value: 0.7,
    why: "A draft made from the start of his sentence is used when it heard at least this share of his final words, and at least openerDraftLeast of them. A line can only be ready as he lets go if it was begun most of a second earlier, when the ear had heard about this much. The thing he asks about is sometimes named at the end, so a draft is told that he is still speaking and to name only what his words so far make certain.",
    measured: "15 recorded asks (2026-11-14): the last early draft was a clean start of his final words in 14; it covered 0.8 of them in 9 and 0.6 of them in 14. At 0.6, one live ask (\"Where on this page do I find the paid university holidays?\") got a quick line drafted from its first words that named the fall term dates, and the answer began \"Actually,\"; At 0.8, a pass of the outside judge had no quick line ready as he let go in 11 of 11 asks, against 4 of 11 at 0.6, and first sentences about half a second later; With only the small-words rule and no share, 1 of 11 was ready. So a share again, 0.7 with a least number of words, and the draft told that the question may be unfinished; counted in the notes of that day",
  } satisfies Setting<number>,

  openerDraftLeast: {
    value: 6,
    why: "A draft that heard fewer words than this is used only when everything he added after it is small words. From a short start the fast model can only guess what he is asking about.",
    measured: "drafts made from the first 0.6 of the recorded questions (2026-11-14): \"Wait. What does a\" (four words) gave \"Let's look at the stats page\" for a question about a forged cookie, and \"What is the riskiest line\" (five) named another part of the page than the one asked about; starts of seven words and more stayed with what was certain",
  } satisfies Setting<number>,

  openerSmallWords: {
    value: ["a", "about", "all", "an", "and", "are", "at", "be", "before", "can", "do", "does", "first", "for", "get", "go", "have", "here", "how", "i", "if", "in", "is", "it", "its", "me", "mean", "my", "now", "of", "on", "or", "out", "please", "right", "so", "that", "the", "them", "then", "there", "these", "this", "those", "to", "too", "try", "up", "was", "we", "what", "when", "where", "which", "why", "with", "work", "works", "would", "wrong", "you", "your"],
    why: "A draft that heard too little by share or by count is still used when every word he added after it is one of these. The quick line names the thing on his page that matters, and a draft that never heard that thing can only guess it; these words cannot be it.",
    measured: "34 drafts made from the first 0.6 of the recorded questions (2026-11-14): where the missing words held the thing asked about, the line guessed (\"Wait. What does a\" gave \"Let's look at the stats page\", the question was about a forged cookie). A first list, from those questions",
  } satisfies Setting<string[]>,

  openerDraftWords: {
    value: 3,
    why: "The opener is not drafted from fewer words than this, since there is nothing to name yet.",
    measured: "not measured",
  } satisfies Setting<number>,

  openerDeadlineMs: {
    value: 800,
    why: "The latest moment after the true release (his finger lifting) at which first words may be sent. If no quick line is written by then, the fixed line is said in its place, the answer is asked at once, and a quick line that comes later is never said: waiting for it up to 1.5 s was tried, and in a pass of the outside judge 5 of 11 asks waited for nothing and first sentences came about half a second later. Its reason: first words he can see and hear inside one second of the release (Nielsen's limit for keeping the train of thought), less the voice's first sound (95 to 124 ms measured), less a margin.",
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
};
