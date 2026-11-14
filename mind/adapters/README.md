# adapters

Promises: one file per vendor per port, and a tape for each port. Nothing outside this folder names a vendor.

| file | port | what it is |
|---|---|---|
| `tape.ts` | all of them | recorded answers from `test/tapes/`, keyed by his words. No key, no cost. An answer can be held until a row releases it, and the tape lists what the brain was asked |
| `anthropic.ts` | Brain, SecondLook, Opener | Claude on the Anthropic SDK. The answer is streamed as structured output and acted on field by field; the opener and the second look run on the fast model with thinking off |
| `claude-shape.ts` | (Brain) | the words of one request to Claude and the shape its reply must have, in the order the model writes it |
| `ink.ts` | Ear | Cartesia Ink over a socket: sound in, words out as he talks, final words at the release |
| `sonic.ts` | Voice | Cartesia Sonic over one warm socket: one sentence in, sound and each word's time out |
| `kept.ts` | Voice | wraps the live voice: a line whose words never change is made once, kept under `tmp/voice/`, and after that said from the kept sound with no call. Named by the service, model, voice and words, so a change of any makes it afresh |
| `fault.ts` | Voice | a voice that fails on purpose, for the outside judge's voice-fails scenario |
| `raea.ts` | Lessons | a lesson clip rendered by raea through `lessons/render.ts`, in the look's colours, once per example |

Keys are read from the environment only; the start scripts load them from a file outside this folder
(`keys.env.example` lists the names). The mind uses a live adapter when its key is set and no tape is asked for, and
says which in its first log line. Models, effort, prices, voices and caps come from settings. Every call takes a stop
signal, and every reply is checked against the same contract as the tape.

Checked by: `live.standin` rows for Claude (request shape, spend cap, a broken reply, a declined ask), with no key and
no network. The ear, the voice and the lessons are checked by live runs only (`./flow`), written down in `notes/`.
