# exam: the outside judge

The app's own rows check each piece alone. The exam checks the whole thing the way a person would meet it: a scripted
ask goes in, a film comes out, and a judge reads the film against a list of what paral must do.

The judge is a separate program from the app on purpose. It imports nothing from `mind/` or `body/`. It reads only what
a run leaves on disk.

## What it promises

- `criteria.ts` is the list: seventeen things paral must do (C1 to C17), and six checks of use (U2 to U7).
- Two bars were chosen by the person this is built for (2026-11-14): the board opens within two seconds of the first
  words, and his first words show within about 2 s of the press (2.5 s in the judge).
- Each file in `scenarios/` is one scripted situation: a page, what he says, what he circles, and what must be true.
- `node exam/run.ts prepare [scenario]` makes, under `tmp/runs/<scenario>/`: the page as a picture, `truth.json` (where
  every line of the page really is), each ask as a sound file, and `flow.json` for the app's `./flow`.
- `node exam/run.ts judge [scenario]` reads the run's `session.jsonl` and its frames, writes `verdicts.json`, makes
  `run.mp4` from the frames and the voice, and prints what fails.
- `node exam/run.ts explain` writes `tmp/runs/index.html`: one page of what works, with each film.
- `node exam/run.ts sheet <scenario> <fromMs> <everyMs>` tiles twelve frames into one picture, to look at by eye.
- `node exam/run.ts planted` is the judge's own test. It runs made-up asks with one fault planted in each, and
  says whether each check fails where it must. It calls no service.

## The order of a full pass

```
node exam/run.ts prepare          # pages, truth, asks, flow files
./flow tmp/runs/<scenario>/flow.json   # the app: a real run, recorded        (the app's command)
./film tmp/runs/<scenario>             # the app: frames and the voice        (the app's command)
node exam/run.ts judge            # verdicts and films
node exam/run.ts explain          # the page
```

A live pass spends money, and a run against a tree that is being edited fails for no real reason. So a pass starts
only when the builder says the tree is frozen, and the builder edits again only after the judge says it is judged.

## What a run must leave for the judge

| File | Who writes it | What it holds |
|---|---|---|
| `session.jsonl` | the mind, during `./flow` | every line that crossed the seam: `{ at, from, line }`, `at` in ms from the run's start |
| `frames/f_00000.png` | `./film` | the bare page, drawn by the same painter with nothing on it |
| `frames/f_00001.png` and up | `./film` | 30 frames a second, at the display's point size |
| `voice.wav` | `./film` | everything the voice said, on the same clock as the frames |
| `drawn.jsonl` | `./film` | where the painter put each thing: `{ at, what, id?, box }`, `what` one of capsule, board, mark, trail, pointer |
| `spend.json` | the mind | `{ usd }`: what the run cost |

## How it judges

- **From the record:** times (release to the thinking look, to the first words, to the first mark), whether a mark's
  box sits on the right line, what was said, whether every sentence was voiced in the same words.
- **From the frames:** a frame is compared with frame 0. Any pixel that differs is something the app drew. The judge
  counts drawn pixels where a thing should be, and where nothing should be.
- **The truth** about where a line is comes from the page itself (`pages/truth.js` asks the browser), never from the
  app's own reading of the page. So a wrong reading shows as a wrong landing.
- **What the video's times can prove.** The video is cut, so most of its times show order, not speed. One turn runs
  with no cut (21:49 to 21:53), and he circles in it. So the two-second bar for a first mark holds where he circled.
  Elsewhere the judge holds the order the video shows: a mark never trails its sentence, and the board is open before
  the first sentence after the opener ends.
- **Silence** is a stretch with nothing new to hear or see. A sentence fills it while it is said, and a mark or a
  board while it is drawn. A look that only shows waiting does not. So filler words are never needed to pass it.
- **A long sentence** holds back everything behind it. No sentence may take longer than 8 s to say.
- **A plain question gets an answer.** The video answers a question about a plan or a page outright (09:14). The hint
  ladder is for his own worked problem. A scenario from the video sets `plain` in what it expects, and then no line of
  the answer may be a hint.
- **The picture sent when he circles** must hold his path and be only the part of the screen round it. The judge
  opens the picture file itself: it counts pixels of the pen's colour, and compares the picture's shape with the
  display's. Lines that came with a place and no words are a second sign of a part. The exam's circles are small, so
  the whole display sent with a circle is a fault here.
- **A sentence is said once, never twice.** DuckyHelper's own notes say so for the tutor in the video (0.10.32). It is
  held within one answer.
- **About the page.** An answer must share words with the page. Only the answer's own sentences, labels and board
  count: a waiting line that happens to hold a word of the page proves nothing. A hint is not held to this. It says
  little on purpose, and the ring on his line is what ties it to the page.
- **The cut-in** comes one second after the first line of the answer before it. At a second and a half the key
  once fell in the pause between two lines, and that run could prove nothing.
- A verdict is `works`, `fails` or `not shown`. `not shown` means this run could not prove it either way.
- **From a reader:** some things only a reader can judge, such as whether a follow-up built on the answer before it.
  Whoever reads a run writes `readings/<scenario>.json`. A reading names the run it read by a mark made from the
  run's record, so it never counts for a later run. A reading may also carry a note for him, as `not shown`.
- **Which line a mark names:** the one line it overlaps most. His own circle, come back as an echo, names no line.
  Ink on a line that no mark names counts against U5.
- Every bar names its source: the video, Nielsen's response-time limits, or the scenario.

## What a film does not prove

The list is in `criteria.ts` (`NOT_LIVE`) and is printed on the explainer: the real key, his microphone, a capture of
his real screen, and the real windows.

## Adding a scenario

1. Write the page in `pages/`. Give `data-id` to every element a scenario may circle or expect a mark on.
2. Write the scenario in `scenarios/`: its steps, and for each what must be true (`src/shape.ts`, `Expect`).
3. Run the full pass above for that scenario.

## A scenario on a real page

A scenario may name a public page with `source` (its address, and a place on it). `prepare` saves a copy under
`tmp/real/`, which is never committed: the page belongs to its publisher. The copy keeps the page's styles, drops
its scripts, uses system fonts and shifts the named place to the top, because a capture with no window does not
finish web fonts or follow a scroll. On such a page a scenario names its target by words that stand on it.

## Borrowed from

- An earlier project's main test: a check is a small data file, and the judge is outside the thing it judges.
- An earlier project's exams: scripted situations run end to end and graded, with the receipts kept.
- SWE-bench: a run that could not be judged is never counted as a pass.
- DialKit (dialkit.dev, MIT) in `vendor/dialkit/`, for the explainer's live controls.
