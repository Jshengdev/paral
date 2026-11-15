# exam: the outside judge

The app's own rows check each piece alone. The exam checks the whole thing the way a person would meet it: a scripted
ask goes in, a film comes out, and a judge reads the film against a list of what paral must do.

The judge is a separate program from the app on purpose. It imports nothing from `mind/` or `body/`. It reads only what
a run leaves on disk.

## What it promises

- `criteria.ts` is the list: twenty things paral must do (C1 to C20), and six checks of use (U2 to U7). C1 to C15
  are what the video shows; C16 and C17 are the team's own (the hint ladder, the rendered lesson); C18 to C20 came
  on the night of 2026-11-14 (the look with no key, keeping a date, "show me").
- Two bars were chosen by the person this is built for (2026-11-14): his first words show within about 2 s of the
  press (2.5 s in the judge), and the board opens on its first row, never empty, and is open before the first
  sentence of the answer ends. The second replaced his earlier choice of an empty card inside two seconds, once he had
  DuckyHelper's own line in front of him ("the board never opens empty").
- Each file in `scenarios/` is one scripted situation: a page, what he says, what he circles, and what must be true.
- `node exam/run.ts prepare [scenario]` makes, under `tmp/runs/<scenario>/`: the page as a picture, `truth.json` (where
  every line of the page really is), each ask as a sound file, and `flow.json` for the app's `./flow`.
- `node exam/run.ts judge [scenario]` reads the run's `session.jsonl` and its frames, writes `verdicts.json`, makes
  `run.mp4` from the frames and the voice, and prints what fails. With the verdicts it writes the commit of the app
  the run was made on: the newest commit in that folder that touched the app's code, never one of the judge's own.
- `node exam/run.ts explain` writes `tmp/runs/index.html`: one page of what works, with each film. Each run's
  card says which commit of the app it is of, and the top names the commit once when every run shares it.
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

A live pass spends money, and a run against a tree that is being edited fails for no real reason. So a pass is made
in a clone checked out at a named commit, and whoever is building never has to stop:

```
git clone . /tmp/judging && (cd /tmp/judging && git checkout --detach <commit> && cd body && swift build)
exam/pass.sh /tmp/judging <round> <scenario>...   # flow, film and judge each; receipts under /tmp/paral-passes/<round>
(cd /tmp/judging && node exam/run.ts explain)     # the page, of that commit
```

`exam/pass.sh` copies this folder's judge and each scenario's prepared page and asks into the clone, so the app is
the commit's and the judge is the newest.

## One step at a time

A pass plays a script. To meet the app as a person does, the stand-in can also be walked: a flow file with
`"live": true` is read again for each step (`body/README.md`), so whoever writes the file adds a step, reads what
the app did, looks at a frame, and only then chooses the next step. The judge's tool for that and the record of each
walk are kept outside this repo, beside the films, because the record quotes the person it was made for.

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
  What covers words is counted apart from what is merely drawn: a pen's stroke hides what is under it, and a faint
  wash inside a box does not (the designer's kit asks for one), so a line's covered share is counted from pixels
  that moved by 120 or more, a tint of about a fifth.
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
- **The picture the answer is made from when he circles** must hold his path and be only the part of the screen
  round it. It is the last picture of the ask. The one taken as he pressed holds the whole page, and the quick line
  is written from its read lines; that is said plainly rather than hidden (his choice of 2026-11-14). The judge
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
- **A cut-in in the middle of an answer** is its own scenario. The key goes down one second after the first sentence
  of the answer itself (`cutInAnswerAfterMs`). Besides the voice stopping, nothing more of the old answer may come
  after the press: no sentence of it and no mark of it.
- **A quick second press** is its own scenario: he lets go and presses again a tenth of a second later with a new
  question (`pressAgainAfterMs`), inside the microphone's grace. The new question must be heard whole and answered,
  and nothing of the ask he took back may be said or drawn. An ask taken back within a second is not held to its
  first words.
- **His whole question is heard.** The words the ear ends with are counted against the words said; seven in ten is
  the bar, since the ear mishears a word now and then. A hold cut short leaves a word or two.
- **A sum said aloud comes out right.** A worked example once said "k equals 8 plus 3. So k is 12": eleven was his
  own answer, which it may not say. The judge reads each sum that is said with what it comes to and adds it up.
- **The last rung stops at the move.** Its worked example may not say what it comes to. A total said there has
  twice been a wrong one, said to keep from saying his own answer.
- **The quick line is twelve words at most** (his choice of 2026-11-14, 16:52). Every line said while he waits is
  held to it. Whether a quick line is true of his page is a reader's to judge, run by run.
- **Dates.** A wrong date costs a student a deadline. A date the scenario names (`says`) must be in the answer as the
  page writes it, with "1st" read as "1". And every date in any answer, a month with its day, must be on a page it
  read (his words: it may say what it found on another page, never what it has no page for). A page it read is the
  page in front of him, or one of the build's kept pages that the mind's log says it gave the model with that ask
  or with any ask or look before it in the same sitting (`src/judge/pages.ts`): one sitting, one memory. A date he said himself, and the day of the run, also count. The kept pages' text is the
  builder's reading of each site; the judge does not check it against the site.
  A scenario can ask that the days to a date be counted rightly from the day of the run (`countsDaysTo`).
  A scenario can also ask that the answer say something in its own words (`saysThat`), such as that the date has
  passed: any one of the listed words shows it, whole words only. The list is a sign, so a reader reads every pass.
- **A piece cut off from its sentence.** A long sentence cut at a comma once left "Which is 13." said on its own.
  The judge holds three signs of that, each heard on film. A reader judges the rest.
- A verdict is `works`, `fails` or `not shown`. `not shown` means this run could not prove it either way.
- **From a reader:** some things only a reader can judge, such as whether a follow-up built on the answer before it.
  Whoever reads a run writes `readings/<scenario>.json`. A reading names the run it read by a mark made from the
  run's record, so it never counts for a later run. A reading may also carry a note for him, as `not shown`.
- **A table's row is one thing.** The page gives each cell of a row as a line of its own. A mark on any cell of the
  row the scenario names counts as on it: once a bracket took two rows by their names and left the date cells alone.
- **Which line a mark names:** the one line it overlaps most. His own circle, come back as an echo, names no line.
  Ink on a line that no mark names counts against U5.
- **A look with no key** (`src/judge/look.ts`; his choice of 2026-11-14, 19:02). A scenario step `{"look": true}`
  scripts what the app's watcher sends by itself, and `"page"` on a step puts another page on the screen from then on.
  On a page it has read it shows one sentence, not spoken. Each step of the trail above the line must be true: the
  pages it says it read are the ones the record names for that look, and the dates it says it found are the ones in
  the line. Every date is on a page it read, the mark is on the line the scenario names, and the board of what is
  ahead runs soonest first with nothing already past. Where the scenario says `"shows": false` (a second look at the
  same screen, a page it has not read) it shows nothing. The app's own watcher is not run by any film.
  One bar here is the judge's own proposal and not one he was shown: when a look sees another page come up, the
  marks drawn for the page before are cleared.
- **Keeping a date** (`src/judge/keep.ts`). Asked to keep a date, the build writes a calendar file and hands it to
  the Mac; he adds it with his own click in Calendar. The judge holds that one such file was handed over and that it
  starts on the day the scenario names. It may say the date is open in his calendar, never that it was added.
- **"Show me"** (`src/judge/showme.ts`; his words of 2026-11-14, 20:00). Each time he says it the build is held to
  the next step of what the looks found: the board names his row, and one sentence begins "Step 2 of 3". Where the
  step is on the page is held by the mark check, or by the way check when it is not in view (the right direction
  on the wire, and on film an arrow at that edge of the screen, on none of the page's words); a look after it is
  held to re-placing that box or arrow. A longer question that only begins "show me" is an ordinary ask.
- **A board that can be read.** A board is shrunk to fit its room and its words shrink with it. Their size is worked
  out from the card the painter drew, and must be 10 points or more, the smallest text style the Mac itself uses.
  A look once drew a one-row board of three long steps 17.5 points tall, its words about 3.5 points.
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
