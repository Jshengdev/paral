# paral

A study helper that sits on the student's own screen. Hold a key and ask out loud. It marks the place on the page,
answers aloud in short sentences, and when the student's own work has a wrong line it gives one hint at a time and
never the answer.

Written at AI@USC, November 14-15 2026. Every line in this folder is written here; nothing is copied from another
project. Libraries: zod (MIT), the Anthropic SDK (MIT), DialKit (MIT, in `dials/vendor/` and `exam/vendor/`). Tools:
raea renders the lesson clips (FSL-1.1, used as a tool like ffmpeg). Outside services: Claude for the answers,
Cartesia for the ear and the voice.

## Commands

| command | what it does | needs |
|---|---|---|
| `./check [words]` | builds the body and runs every row, or the rows whose name contains the words | nothing: no key, mic or screen |
| `./flow RUN/flow.json` | a real run with no screen: a scripted ask goes through the real mind and services, every line recorded | the keys |
| `./film RUN` | replays a recorded run through the real scene and painter into frames and a voice track | nothing |
| `./tune` | the dials page: every colour, size and motion time, saved to `body/tokens.json` | a browser |
| `./run` | the real thing: lists the two grants, then starts the mind and the app | the keys, a microphone, the screen grant |
| `./run build`, `./run grants`, `./run stop` | bundle and sign only; print the grants only; end both | |

`PARAL_TAPE=test/tapes/NAME.json ./flow ...` runs on recorded answers and calls no service. `SHOW=1 ./check words`
prints what a row did. `FREEZE=1 ./check words` fills in a new row whose `out` is null, and fails so you read it.

Keys never live in this folder. The start scripts read `~/.config/paral/keys.env` (or the file `PARAL_KEYS` names);
`keys.env.example` lists the names.

## Shape

```
body (Swift)                      seam                       mind (TypeScript, Node 26, no build step)
key, mic, screen picture  ──────► one schema, one line  ───► turn.ts   one hold of the key = one ask
overlay window, speaker   ◄────── of JSON per event    ◄──── ask.ts    one ask, acted on while the answer arrives
Scene → Picture → Painter                                    cores/    the logic: values in, values out
                                                             ports.ts  one small interface per outside service
                                                             adapters/ one file per vendor, and a tape for each
                                                             settings/ every value, with why and what was measured
```

- **The body draws what it is told and decides nothing about teaching.** `Scene` turns the lines that crossed the seam
  into a `Picture` (plain values) for any moment; `Painter` draws a picture with `body/tokens.json`. The real window
  and the film use the same two, so a film shows what the screen shows.
- **The mind is ports and cores.** `turn.ts` and `ask.ts` wait and do the I/O; every decision is a pure function in
  `cores/`. Every service has a tape adapter that replays recorded answers, so everything runs with no key.
- **A row is the unit of proof.** One test file; a check is a JSON row in `test/rows/`.

## The verbs

| verb | what it means here | where |
|---|---|---|
| Catch | his words while the key is held, and what he drew around | `cores/catch.ts`, `cores/circle.ts` |
| Ground | a quoted line becomes one box on his screen, or "not found" | `cores/ground.ts` |
| Show | marks, the board, the clip, the pointer | `cores/beats.ts`, the body's scene and painter |
| Teach | which rung of the ladder comes next | `cores/happened.ts`, `cores/teach.ts` |
| Push | nothing that holds the result is ever said or shown | `cores/push.ts`, `cores/lesson.ts` |
| Hold | what this conversation has said and drawn so far | `cores/hold.ts` |

## What one ask does

1. Key down: the body sends `key.down`, the microphone's sound, the pointer's path if the draw key is held, and a
   picture of the screen with the lines read from it. The mind sends his words back as they are heard.
2. Key up: "thinking" at once. If he drew, his loop comes back as a ring (`echo`), with no model asked. If his words ask for
   a drawing, an empty card opens, to be filled by the board or taken away.
3. The opener, one short line from the fast model, as soon as it is written. If none is out one second after release, a fixed line is said first and the opener follows. If the deep answer has not begun to arrive 1.3 s after that has been heard, a fixed stall line, and up to two more.
4. When the deep answer's first fields arrive, it is one of two things. **A wrong line in his work:** a ring on that
   line, the rung's fixed line said with it, then the model's hint once Push has passed it. One rung per ask, one sentence
   for the first three rungs. Where lines sit close the ring is a box that hugs the line.
   **No wrong line:** the fast model's line about the page, then up to three sentences, each with its mark, and a
   board at the end.
5. If the model named a lesson, one sentence and then a rendered clip on an example that is not his.
6. It rests. Marks stay. A follow-up is told what was said and what is still drawn. The cross on the resting circle
   clears it.

## Adding a capability

Do these in order. Each step has a row before the next one starts.

1. **Seam.** If something new must cross between body and mind, add one line type to `seam/schema.ts`, read it in
   `body/Sources/ParalBody/Seen.swift` (or write it in `Lines.swift`), and describe it in `seam/README.md`. The wire
   only grows: never change or remove a field.
2. **Core.** Put the decision in a pure function in `mind/cores/`: values in, values out, no settings import. Add a
   runner in `test/main.test.ts` and a row. Look at `cores/circle.ts` and `test/rows/circle-names-the-lines.json`.
3. **Setting.** Every number or fixed line goes in `mind/settings/`, in the file for what it governs, with `why` and
   `measured`. "Not measured" is an honest value.
4. **Port.** A new outside service is one interface in `mind/ports.ts`, one adapter in `mind/adapters/`, and a tape
   field in `adapters/tape.ts`. Look at `adapters/raea.ts`.
5. **Turn or ask.** Call the core from `mind/turn.ts` (things that happen once per hold) or `mind/ask.ts` (things that
   depend on the answer). Add a `turn` row that plays the lines in and checks the lines out.
6. **Scene.** Teach `Scene.take` the new line and give `Picture` the new plain values, in `ScenePicture.swift`.
7. **Painter.** Draw the new values in a `Painter*.swift` file. Every size, colour and time is a token in
   `body/tokens.json`, so it shows up on the dials page by itself.
8. **A filmed row, then a live run.** A `body.filmed` row proves the whole chain on a tape. Then one `./flow` and
   `./film` of your own in `tmp/dev/`, and look at the frames.

The lesson clip was added in this order: the `clip` line, `cores/lesson.ts`, the `lessons` setting, `adapters/raea.ts`,
`ask.ts`, the scene, `PainterClip.swift`, then one live run.

## Rules

- One test file. A check is a row. A bug becomes a failing row first, then the fix.
- No number without its reason and its measurement. One run is a first look, and is written down as one run.
- Fail early and say so. A fallback is logged and shown, never silent.
- One job per file. A row fails when a source file passes 220 lines.
- Every model call takes a stop signal. Never print a key.
- A prompt is a file in `mind/prompts/`. A row holds each one's fingerprint, so a prompt cannot change unseen.
- Each piece that ships gets one dated line in `notes/`.

## Who owns what

`exam/` and `lessons/` are written by a second session that works beside this one: the outside judge, its scenarios, and the lesson
compositions. `tmp/runs/` is the exam's; your own runs go in `tmp/dev/`.

## Known limits

- The real windows are compiled and bundled and have never been started. The key, the microphone, the screen picture
  and the overlay over real apps are unproven until a person runs `./run`.
- What leaves the Mac with the live services: on each ask, the sound of the question goes to the ear's API; one scaled
  picture of the main display, the lines read from it, his words and the lesson so far go to the model's API; each
  sentence of the answer goes to the voice's API. With a tape nothing leaves. paral keeps one temporary picture file,
  overwritten on each ask.
- The lesson lives for one connection. Restarting the body or the mind starts it over.
- A line he edits is treated as the same wrong line, still wrong, even when the model has moved to a later line.
- A follow-up that the model words as a new problem wipes the marks of the one before.
- The board comes with the end of the answer, since it is the last field of the reply.
- One lesson exists (`balance`), with three fixed examples.
- Landing a mark on the right line is measured on generated pages only, not on real course pages.
