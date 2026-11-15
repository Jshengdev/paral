# mind

Promises: a local server that takes lines from the body, runs one ask per hold of the key, and sends lines back.
Every decision is a pure function in `cores/`; every outside service is behind `ports.ts`; every value is in
`settings/` with its reason.

| file | job |
|---|---|
| `main.ts` | reads the environment, picks a live adapter or the tape for each port, starts the server, stops it cleanly |
| `server.ts` | the socket: one connection is one conversation; can record every line that crosses |
| `turn.ts` | one hold of the key: his words, his path, the picture, then one ask |
| `drafts.ts` | the opener, drafted from his words while he is still talking, so a line is written by the time he lets go |
| `ask.ts` | one ask, acted on while the answer is still arriving: reads its first fields, wipes what no longer applies, and takes one of two roads |
| `hint.ts` | the road when his work has a wrong line: the ring, the rung's fixed line, and the hint once Push has passed it |
| `explanation.ts` | the road when it has none: sentences with their marks as they finish, and the board |
| `card.ts` | the board of one ask: sent the moment it is whole. It can also open an empty card first when his words ask for a drawing (filled when the board arrives, taken away when none comes); that is switched off, `drawingAsks` is empty |
| `clip.ts` | the lesson clip of one ask: the example picked on other numbers than his, the clip started early and sent after the words |
| `fast.ts` | the fast lines of one ask: the quick line, its deadline and fixed stand-in, the wait for it, and the stall lines |
| `speech.ts` | the voice for one ask: sentences one after another; a failure turns the rest to words only |
| `glance.ts` | the looks taken without the key: on one of USC's kept pages, the one thing that will cost him later is marked where it is on his screen, with one line and its trail in the capsule and a board of what is ahead. After an answer that sent him to another kept page, the look there is for what he was sent for |
| `after.ts` | what the looks do after an answer: nothing while the page has not moved under it; when it has, what was drawn is wiped and the place the answer sent him to is marked where it now stands. The page's own first thing does not come back until his next ask |
| `place.ts` | where a kept line is on his screen now: its own line, the heading it sits under, or which way it lies; and the mark or the way line for it |
| `settings/cues.ts` | the cue cards: lines he can tap instead of saying them |
| `ready.ts` | the line the mind sends when the body connects: every setting the body needs |
| `guide.ts` | the demo's guide: what to do next on the kept page on his screen, moving on as the mind sees each step happen; no model asked |
| `adapters/looked.ts` | a page's first look, kept on disk for the day and asked ahead when the mind starts, so the look does not wait for the model |
| `spots.ts` | rings on a measured drawing: finds a sheet on his screen, tells the model its places' names, rings the ones an answer names |
| `showme.ts` | "show me": the walk through what is ahead, one step each time he says it or clicks the step's box, with the board, one sentence and the box or the way; no model asked |
| `takes.ts` | what paral does in his browser for him, on his word only: "take me there" (the app is asked to open a kept page's address), "scroll for me" (the app is asked to scroll to what an arrow points at) and "open it for me" (the app is asked to click once on the closed heading paral has boxed; every condition for that click is written out there); and the card an answer stays on; no model asked |
| `keep.ts` | "add it to my calendar": the date last shown is written into a calendar file and the body is told to open it, with no model asked |
| `ports.ts` | the interfaces: Brain, SecondLook, Opener, Ear, Voice, Lessons |
| `settings.ts`, `settings/` | every value, one file per thing it governs |
| `prompts/` | one prompt per job; a row holds each one's fingerprint |
| `cores/page.ts`, `cores/dates.ts` | which of USC's kept pages (`../pages/kept/`) is on his screen; the dates a text names, counted from today, and whether a date said is on a page that was read |

## What is said, and by whom

| line | who writes it | when it is said |
|---|---|---|
| the quick line | the fast model, from his words and the lines read off his page: what it is about to look at, naming the thing that matters; on his own working only that it will go through his steps. A fixed line while a wrong line is open, or when the model's line is long, unfit or fails | as he lets go, when a draft made while he talked heard enough of his question and is written by 0.8 s after release. Otherwise a fixed line is said at that mark and a quick line that comes later is never said. The deep model is told the line he heard |
| his loop as a ring (`echo`) | nobody: code, from his path | right after his words are final |
| the rung's fixed line | a setting (`ladder`) | with the ring, the moment the wrong line is known |
| the hint | the deep model, one rung per ask, in the number of sentences its rung allows | after Push has passed it |
| the explanation | the deep model, up to three sentences | each sentence as it is finished. Its board goes out the moment it is whole and its first mark ahead of the first sentence, since the reply gives the board before the sentences and each mark before its words |

Run: `npm run mind`, or let `./flow` and `./run` start it. Environment: `PARAL_TAPE` (recorded answers, no service),
`PARAL_RECORD` (write every line to a file), `PARAL_SOCKET`, `PARAL_SPEND` (write what the run cost on stop),
`PARAL_FAULT=voice` (the voice fails on purpose).

Checked by: every `turn`, `stop` and `live.standin` row, and one row or more per core.
