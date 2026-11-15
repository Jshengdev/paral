import type { Example } from "../cores/lesson.ts";
import type { Rung, Setting } from "./types.ts";

/** Settings for teaching: the ladder, what is said, what counts as the same line, circles and lessons. */
export const teach = {
  ladder: {
    value: [
      { name: "look", may: "Says where to look. Names no idea, asks nothing and shows no step.", sentences: 1, safe: "Read the highlighted line again, slowly." },
      { name: "idea", may: "Names the idea that applies, in general words, and stops there. Uses no number from the student's own line, asks no question and shows no step.", sentences: 1, safe: "Ask which rule the highlighted line has to obey." },
      { name: "question", may: "Asks one leading question about the step. Shows no step.", sentences: 1, safe: "What must be true on the highlighted line before the next line can follow?" },
      { name: "parallel", may: "Works a step of the same kind on other numbers and with another letter than the student's. No number of the example, and above all not what it comes out to, may be the student's own answer or any number of it. Stop at the line that shows the move: do not say what the example comes to. End by sending the student back to their own line to compare it with that move, without saying what their line should be.", sentences: 2, safe: "Try the same move on a simpler case, then come back to this line." },
    ],
    why: "Four fixed rungs, none holding the result, so the answer is never one rung away. One rung is given per ask, and each rung has one move: the first three get one sentence, since a second sentence is where a hint slid into the next rung's move. The top rung's example stops at the move and says no total: a total is where it once said a sum that was not true (\"k equals 8 plus 3. So k is 12\"), to keep from saying his answer. It ends by sending him back to his own line, since an example that ends on a flat statement (\"So the right becomes 8 plus 3.\") is what the second look takes for the corrected step and swaps.",
    measured: "one live hint on the second rung named the idea and then asked the third rung's leading question in its second sentence (2026-11-14, the outside judge). The one-sentence rungs have not been judged live. On the idea rung, 3 of 98 recorded hints went on to apply the idea to his own number (\"So getting rid of a minus six means adding six to both sides.\", the same sentence each time); \"uses no number from the student's own line\" was added for that and its effect is not measured, since one in thirty is too rare to see in a short probe. The top rung, 20 asks of the deep model on one page before and after \"stop at the line that shows the move\" was added (2026-11-14): a total said in 11 of 20 before and 0 of 20 after; an example that adds up to his answer without saying so in 5 of 20 both times, nearly all on a repeat visit (\"8 plus 3\"). With that sentence alone, a repeat visit's hint was swapped by the second look in 10 of 14 live asks (the judge's passes and four runs here), so he heard the fixed line three asks running; asked eight times about each of twelve such hints, the second look flagged every one that ended on a statement about the example and none that ended by sending him back to his line. With \"end by sending the student back\" added: 0 of 20 swapped in a probe of the deep model with the guard run on each, and in four live runs of the six-ask scenario 2 of 8 repeat visits swapped, against 5 of 8 with this wording's two forerunners; the judge then had 3 of 6. The second look gives a line the same verdict every time and near-identical lines opposite ones: changing only the example's letter from k to x turned 0 of 8 into 8 of 8, so \"with another letter than the student's\" was added, and four more live runs had 1 of 8 repeat visits swapped, no example in x",
  } satisfies Setting<Rung[]>,

  spotsMost: {
    value: 2,
    why: "At most this many places of a measured drawing are ringed for one answer. More than two rings on a small drawing read as the whole of it marked, and a set of rings can show the result between them.",
    measured: "not measured",
  } satisfies Setting<number>,

  justTellMe: {
    value: ["just tell me", "give me the answer", "what is the answer", "what's the answer", "tell me the answer"],
    why: "Words that mean he wants the result. They raise the rung by one, like any other ask, and never more. Their one effect of their own: said after he has changed the wrong line and it is still wrong, they still climb a rung, where the changed line alone would get the same rung again in new words.",
    measured: "not measured; a first list, to grow from what students actually say",
  } satisfies Setting<string[]>,

  sentenceMaxWords: {
    value: { plain: 22, withNumbers: 14, letters: 110 },
    why: "A spoken sentence longer than this is cut where both parts stand as sentences (after a colon or semicolon, at a comma before \"so\", or before \"and\" or \"but\" with a subject after it; a tail that says where the thing is written, \", per the ...\", is cut off and said as \"That's per the ...\") and the rest is said as the next sentence. With no such place it stays whole, so a low limit cuts nothing badly. The prompt asks for eighteen; this is the guard for when the model runs over. A worked step, which is a sentence with three numbers or more, has a lower limit, since numbers are slow to say. A lesson's one sentence is left whole. `letters` cuts a sentence that is within its words and still slow: the voice says about fourteen letters a second, and every sentence over eight seconds in a full pass was over about 120 letters, most of them 16 to 22 words. Such a sentence is cut at a semicolon or at a comma before \"so\", \"and\" or \"but\" with a subject after it, not at a colon.",
    measured: "a 28-word sentence took 8.2 s to say and a 22-word one 7.9 s; on the top rung five worked examples of about 21 words took 8.1 to 9.1 s, for example \"Take y minus 4 equals 9: to get y alone you add 4 to both sides, so y equals 9 plus 4.\" (2026-11-14, the outside judge). Three sentences in six later passes still ran 8.0 to 8.2 s (20, 26 and 27 words), each with a clean place at \", so\" that the rule then turned down; the rule now takes it, which cuts the two long ones. A limit of 19 was tried on the 829 sentences of the recorded runs and dropped: of 58 it cut, two were lists cut at \", and the\" (\"And the same six-character code, about a third as long.\"). The 20-word one stays whole. On November 15 a pass of 72 answers on real USC pages had ten sentences of 8.1 to 9.9 s, 98 to 171 letters; the letters limit cuts two of them (at \", and the\" and at a semicolon), and the rest have no place to cut, which the prompt now asks the model not to write",
  } satisfies Setting<{ plain: number; withNumbers: number; letters: number }>,

  maxBeats: {
    value: 3,
    why: "An explanation of something on the page is at most this many spoken sentences, each with one mark at most. Short, because every word is written before anything can show, and he can ask for more.",
    measured: "one live run at six sentences: about 120 words, 40 s of speech, and the first sentence 7.8 s after the release (2026-11-14)",
  } satisfies Setting<number>,

  heldBackLine: {
    value: "I can't hand that over, but I can help you get there. Ask me where to look.",
    why: "Said in place of an explanation that the code check found giving a result away.",
    measured: "not measured",
  } satisfies Setting<string>,

  notFoundLine: {
    value: "I could not find that line on your screen.",
    why: "Said in front of the hint when the quoted line matches nothing read from the picture, so paral never draws a guess.",
    measured: "not measured",
  } satisfies Setting<string>,

  sameLineScore: {
    value: 0.98,
    why: "The lesson keeps the break line as the Mac read it. A later read counts as the same, unchanged line when it matches that text at this likeness or above. Two reads of unchanged pixels usually agree exactly, so this is set high on purpose: paral would rather call a rare misread a change (he gets the same rung in new words) than call his one-character fix unchanged (he would climb a rung for nothing).",
    measured: "a changed sign in a 40-character line scores 0.975 and counts as a change; not yet measured over repeated readings of one real page",
  } satisfies Setting<number>,

  sameProblemScore: {
    value: 0.5,
    why: "Below this likeness the problem the brain read is treated as a new problem, and the lesson starts over at the first rung.",
    measured: "not measured; first guess",
  } satisfies Setting<number>,

  groundMinScore: {
    value: 0.6,
    why: "How alike a quoted line and a read line must be before the highlight is drawn. Below it, paral says it could not find the line instead of guessing.",
    measured: "on six generated pages (20 lines, quotes written the way a model writes them): the Mac read 14 lines exactly, all 20 quotes matched a line, and 19 highlights were on target by quote alone, 20 when the brain also gave the line number; the one miss by quote was a line that appears twice. Clean synthetic text, one run; real course pages are not measured yet",
  } satisfies Setting<number>,

  ringReach: {
    value: { share: 0.25, points: 13, snug: 7.5 },
    why: "How far a ring's ink reaches above and below its line: this share of the line's height plus this many points. Where the nearest line above or below is closer than that, the mark is a box that hugs the line. Worked out from the body's tokens as they stand: the ring is 1.5 times as tall as the line and its pad (so a quarter of the line's height, plus 1.5 times the pad of 6), plus half the pen's width of 3.5, plus a margin of 2. If those tokens are turned far on the dials, turn this with them. `snug` is the least gap in which a box's edge fits between two lines, the pen's width plus 4 points; closer than that the mark is an underline.",
    measured: "with a free share of half the line's height, a heading 14.4 points above a 19.5-point line was still inked by 11% (2026-11-14, the outside judge): the ring reaches 13.9 points plus the pen there. In a code block a ring had inked 21% of the line above it",
  } satisfies Setting<{ share: number; points: number; snug: number }>,

  drawingAsks: {
    value: [] as string[],
    why: "Words of his that ask for a drawing. With any here, an empty card opens the moment he says one, before any model has spoken, and the board fills it when it arrives; if none comes the card is taken away. The list is empty, so no empty card opens and the board appears on its first row: the owner's choice on 2026-11-14 at 16:52, in place of his earlier one for the card, since the tutor this follows never opens its board empty. To bring the card back, put the words back: draw, diagram, sketch, \"show me what … look\".",
    measured: "without the card a board came 2.2 to 3.4 s after the first words (2026-11-14, the outside judge), since it waits for the deep model; with it, in about 0.4 s, and in one judged run it then stood empty for about nine seconds",
  } satisfies Setting<string[]>,

  circleLeast: {
    value: { points: 8, side: 24, share: 0.5 },
    why: "What counts as drawing around something: at least this many pointer samples, at least this many points wide or tall, and a line counts when at least this share of it is inside the path's box. Less than that is a slip of the hand.",
    measured: "not measured on a real hand; the exam's scripted circles have 30 or more samples",
  } satisfies Setting<{ points: number; side: number; share: number }>,

  circleNoWordsLine: {
    value: "Go ahead, I'm listening.",
    why: "Said when he draws around something and says nothing. No model is asked and nothing is drawn; what he drew around is kept for his next ask.",
    measured: "not measured",
  } satisfies Setting<string>,

  lessons: {
    value: {
      balance: {
        idea: "an equation is a balance: do the same thing to both sides and it stays true. It fits when the student asks why a term changes sign when it moves to the other side, or why they may add or subtract on both sides.",
        examples: [
          { left: "x − 4", right: "9", add: "+ 4", leftAfter: "x", rightAfter: "13", say: ["Both sides weigh the same.", "Do the same to both sides.", "It stays level."] },
          { left: "x + 5", right: "12", add: "− 5", leftAfter: "x", rightAfter: "7", say: ["Both sides weigh the same.", "Do the same to both sides.", "It stays level."] },
          { left: "y − 2", right: "6", add: "+ 2", leftAfter: "y", rightAfter: "8", say: ["Both sides weigh the same.", "Do the same to both sides.", "It stays level."] },
        ],
      },
    },
    why: "The clips that can be shown for a hard idea, each with fixed examples. The model only names a lesson; the example is chosen in code, the first one that shares nothing with his page and does not hold his result. A fixed example is rendered once and then comes back at once, and it can never carry his answer.",
    measured: "the first render after a start took 17 s and the next 2.5 s (one run each, 2026-11-14, measured by the session that wrote lessons/); see notes for the times through the mind",
  } satisfies Setting<Record<string, { idea: string; examples: Example[] }>>,
};
