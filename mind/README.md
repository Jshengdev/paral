# mind

Promises: a local server that takes lines from the body, runs one ask per hold of the key, and sends lines back.
Every decision is a pure function in `cores/`; every outside service is behind `ports.ts`; every value is in
`settings/` with its reason.

| file | job |
|---|---|
| `main.ts` | reads the environment, picks live adapters or the tape, starts the server |
| `server.ts` | the socket: one connection is one conversation; can record every line that crosses |
| `turn.ts` | one hold of the key: his words, his path, the picture, then one ask |
| `ask.ts` | one ask, acted on while the answer is still arriving: ring, lines, marks, board, clip |
| `card.ts` | the board of one ask: an empty card opened when his words ask for a drawing, filled when the board arrives, taken away when none comes |
| `fast.ts` | the fast lines of one ask: the opener, its deadline and fixed stand-in, and the fast model's line about the page |
| `speech.ts` | the voice for one ask: sentences one after another; a failure turns the rest to words only |
| `ports.ts` | the interfaces: Brain, SecondLook, Opener, Ear, Voice, Lessons |
| `settings.ts`, `settings/` | every value, one file per thing it governs |
| `prompts/` | one prompt per job; a row holds each one's fingerprint |

## What is said, and by whom

| line | who writes it | when it is said |
|---|---|---|
| the opener | the fast model; a fixed line while a wrong line is open, or when the model's line is long or fails | as soon as it is written. If it is not there one second after release, a fixed line is said first and the opener follows when it comes, unless the answer has begun |
| his loop as a ring (`echo`) | nobody: code, from his path | right after his words are final |
| the rung's fixed line | a setting (`ladder`) | with the ring, the moment the wrong line is known |
| the hint | the deep model, one rung per ask, in the number of sentences its rung allows | after Push has passed it |
| the fast line about the page | the fast model | only once the deep answer says there is no wrong line |
| the explanation | the deep model, up to three sentences | each sentence as it is finished. Its board goes out the moment it is whole and its first mark ahead of the first sentence, since the reply gives the board before the sentences and each mark before its words |

Run: `npm run mind`, or let `./flow` and `./run` start it. Environment: `PARAL_TAPE` (recorded answers, no service),
`PARAL_RECORD` (write every line to a file), `PARAL_SOCKET`, `PARAL_SPEND` (write what the run cost on stop),
`PARAL_FAULT=voice` (the voice fails on purpose).

Checked by: every `turn`, `stop` and `live.standin` row, and one row or more per core.
