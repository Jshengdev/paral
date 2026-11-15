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
| `glance.ts` | the looks taken without the key: on one of USC's kept pages, the one thing that will cost him later is marked where it is on his screen, with one line and its trail in the capsule and a board of what is ahead |
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
