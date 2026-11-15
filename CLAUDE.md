# paral

A study helper that sits on the student's own screen. Hold a key and ask out loud. It marks the place on the page,
answers aloud in short sentences, and when the student's own work has a wrong line it gives one hint at a time and
never the answer.

Written at AI@USC, November 14-15 2026. Every line in this folder is written here; nothing is copied from another
project. Libraries: zod (MIT), the Anthropic SDK (MIT), DialKit (MIT, in `dials/vendor/` and `exam/vendor/`). Tools:
raea renders the lesson clips (FSL-1.1, used as a tool like ffmpeg). The app's icon (`body/AppIcon.icns`) is the team's own logo, drawn by its designer this weekend. Outside services: Claude for the answers,
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
| `node pages/gather.ts` | reads the public USC pages named in `pages/list.json` and keeps their text in `pages/kept/`, closed sections and all | the network |

`PARAL_TAPE=test/tapes/NAME.json ./flow ...` runs on recorded answers and calls no service. `SHOW=1 ./check words`
prints what a row did. `FREEZE=1 ./check words` fills in a new row whose `out` is null, and fails so you read it.

Keys never live in this folder. The start scripts read `~/.config/paral/keys.env` (or the file `PARAL_KEYS` names);
`keys.env.example` lists the names.

## Shape

```
body (Swift)                      seam                       mind (TypeScript, Node 26, no build step)
key, mic, screen picture  ──────► one schema, one line  ───► turn.ts   one hold of the key = one ask
overlay window, speaker   ◄────── of JSON per event    ◄──── ask.ts    one ask: a hint (hint.ts) or an explanation
Scene → Picture → Painter                                    (parts)   of one ask, a file each: see mind/README.md
                                                             cores/    the logic: values in, values out
                                                             ports.ts  one small interface per outside service
                                                             adapters/ one file per vendor, and a tape for each
                                                             settings/ every value, with why and what was measured
pages/   USC's public pages, read ahead of time and kept as text: what paral knows beyond the screen
sheets/  pages measured once: a box for each place of a drawing (an atom, a bond), found on screen by the page's own lines
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
| Show | marks fitted to their room, sentences cut to be said, the board, the clip, the pointer | `cores/beats.ts`, the body's scene and painter |
| Teach | which rung of the ladder comes next | `cores/happened.ts`, `cores/teach.ts` |
| Push | nothing that holds the result is ever said or shown | `cores/push.ts`, `cores/lesson.ts` |
| Hold | what this conversation has said and drawn so far | `cores/hold.ts` |

## What one ask does

1. Key down: the body sends `key.down`, the microphone's sound, the pointer's path if the draw key is held, and a
   picture of the screen with the lines read from it. The mind sends his words back as they are heard.
2. Key up: "thinking" at once. When his words are final, about 0.4 s later: if he drew, his loop comes back as a ring
   (`echo`), with no model asked. (An empty card for an ask that wants a drawing exists and is switched off: the board
   opens on its first row. See `drawingAsks`.)
3. The quick line: one short line from the fast model, drafted while he talks and said as he lets go. It may name the
   thing on his page that matters, never the result; on his own working it names only his working. If none is written
   0.8 s after release, a fixed line is said in its place and a quick line that comes later is never said. The deep
   model is told the line he heard, word for word, so its call waits for that line, to the 0.8 s mark at the latest.
   If the deep answer has not begun 1.3 s after the last line has been heard, a fixed stall line, and up to two more.
4. When the deep answer's first fields arrive, it is one of two things. **A wrong line in his work:** a ring on that
   line, the rung's fixed line said with it, then the model's hint once Push has passed it. One rung per ask, one sentence
   for the first three rungs. Where lines sit close the ring is a box that hugs the line.
   **No wrong line:** the board as soon as it is whole, the first mark, then up to three sentences, each with its
   mark.
5. If the model named a lesson, one sentence and then a rendered clip on an example that is not his.
6. It rests. Marks stay. A follow-up is told what was said and what is still drawn. The cross on the resting circle
   clears it.

## What a look without the key does

When the mind has kept pages and a model, its ready line asks the body to look by itself (`lookEveryMs`). The app's
`Watch` takes a picture every so often, reads it, and sends a `look` line when what it read has changed and then
stood still. The mind (`mind/glance.ts`) acts only when the screen is one of USC's kept pages. The first time it
sees a page it asks the deep model about the kept page's own text, whether it holds one thing that will cost him
later; nothing read from his screen is sent for that. If so: a box on the line where it now is on his screen (the
line itself, or the heading it sits under), one sentence on the nudge card with the trail of what was done under its name,
and a board of what is still ahead. The first time a page's look shows a date the sentence is also said aloud,
once (`unaskedVoice`); every later look of that page is shown and not spoken. When he scrolls or opens a section the mark moves. After an
answer that pointed at a date or a section of this page, the looks keep to that place until his next ask, and the
page's own first thing does not come back over it. A date he has kept is not offered to be kept again. What
is ahead is remembered for the sitting and given to every ask. A press of the key takes over at once.

**A page's first look is kept.** Its question is about the kept page's own text and today's date, so the answer is
the same all day: it is asked once, kept in `tmp/looks/`, and asked ahead for every kept page when the mind starts
(`mind/adapters/looked.ts`). A look after an ask is always asked live.

**It guides from page to page.** For three minutes after an answer (`followForMs`), a look at another kept page is
taken as him following that answer: the model is asked only whether this page holds what he was sent for, and if so
the place is boxed with one line ("found what you asked for"). paral clicks nothing; he goes there himself.

**"Show me."** When those are his whole words (`showMeAsks`), paral walks him through what is still ahead, one step
each time he says it (`mind/showme.ts`). For the step he is on: the board of all the steps with `now` naming his
row, one spoken sentence from a fixed pattern, and a box on the kept line that writes the step's date, or the way
to it, or the name of the kept page it is on. No model is asked. Until his next ordinary ask the looks follow that
step, so the box moves as he scrolls. Two things move him on: "show me" again, and a click on the step's box. The
app tells the mind where each press of the left button lands (a `click` line); the mind uses it only to see a click
inside the box of the step he is on, when that box is on the step's own line, and then shows the next step without
speaking.

**The demo's guide.** For a kept page that has steps (`demoSteps`, by the page's name), the mind tells the body what
to do next, one step at a time, with a `next` line: "Scroll until Deadlines is on screen", 2 of 8. It moves on when
the mind sees the step happen (`mind/guide.ts`, `cores/guide.ts`): the look showed its line, its mark reached the
heading or the line, a "show me" step was given, a date was kept, an ask holding certain words was answered. A step
done out of order counts. It asks no model. The body draws the card and can hide it.

**Rings on a drawing.** A sheet in `sheets/` is a page measured once: some of its printed lines, and a box for each
place of a drawing on it. On each ask the mind tries to find the sheet on his screen from those lines
(`cores/sheet.ts`: one scale and one shift, refused under two lines or when the fit is poor), which gives every place
a box with no model pointing at the picture. The model is told the places' names and may name at most two its
sentences speak of (`spots`); `mind/spots.ts` rings them with the sentence. Never the signs between the reactants,
and never the space the result goes in. With no sheet on screen nothing changes.

**A tapped ask.** The menu bar's menu lists cue cards (`cueCards`, sent in the ready line): lines he can tap instead
of saying them, for a hall too loud for the microphone. A tapped line crosses the seam as `typed` and is asked exactly
as a spoken one, with the same picture of the screen and no ear. In a flow file the step is `{"typed": "the words"}`.

**The way.** When the thing is on this page and neither its line nor its heading is in view, a `way` line goes out
in the mark's place: up or down, and what it leads to (`mind/place.ts`, `cores/page.ts` `whichWay`).

**"Add it to my calendar."** The date paral last showed him, from a look or from an answer, can be kept
(`mind/keep.ts`, `keepAsks`). No model is asked: the date is written into a calendar file (.ics) with the line as the
page writes it and the page's address, an `open` line crosses the seam, and the app opens the file in his calendar
app (`Keep.swift`). The app opens nothing but a file ending in .ics, and clicks nothing in the calendar.

## Adding a capability

Do these in order. Each step has a row before the next one starts.

1. **Seam.** If something new must cross between body and mind, add one line type to `seam/schema.ts`, read it in
   `body/Sources/ParalBody/Seen.swift` (or write it in `Lines.swift`), and describe it in `seam/README.md`. The wire
   only grows: never change or remove a field.
2. **Core.** Put the decision in a pure function in `mind/cores/`: values in, values out, no settings import. Add a
   runner to the table in `test/main.test.ts` and a row. Look at `cores/circle.ts` and `test/rows/circle-names-the-lines.json`.
3. **Setting.** Every number or fixed line goes in `mind/settings/`, in the file for what it governs, with `why` and
   `measured`. "Not measured" is an honest value.
4. **Port.** A new outside service is one interface in `mind/ports.ts`, one adapter in `mind/adapters/`, and a tape
   field in `adapters/tape.ts`. Look at `adapters/raea.ts`.
5. **Turn or ask.** Call the core from `mind/turn.ts` (things that happen once per hold), `mind/ask.ts` (things that
   depend on the answer's first fields), or one of the ask's two roads: `mind/hint.ts` when his work has a wrong line,
   `mind/explanation.ts` when it has none. The parts of one ask each have their own file, and a new part gets one
   too: `fast.ts` (lines said while he waits), `drafts.ts` (the opener drafted while he talks), `card.ts` (the
   board), `clip.ts` (the lesson clip), `speech.ts` (the voice, one sentence after another). Add a `turn` row that
   plays the lines in and checks the lines out.
6. **Scene.** Teach `Scene.take` the new line and give `Picture` the new plain values, in `ScenePicture.swift`.
7. **Painter.** Draw the new values in a `Painter*.swift` file. Every size, colour and time is a token in
   `body/tokens.json`, so it shows up on the dials page by itself.
8. **A filmed row, then a live run.** A `body.filmed` row proves the whole chain on a tape. Then one `./flow` and
   `./film` of your own in `tmp/dev/`, and look at the frames.

The lesson clip was added in this order: the `clip` line, `cores/lesson.ts`, the `lessons` setting, `adapters/raea.ts`,
`clip.ts` (called from `ask.ts`), the scene, `PainterClip.swift`, then one live run.

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

- The look without the key has been checked only through the scripted stand-in. The app's own watcher
  (`Watch.swift`) first ran on the owner's Mac at 0f437af, and no look of its own has been read back yet: how often
  it fires on a real page, and whether the text reader's wobble makes it fire twice or never, are unknown. At rest it
  held about a third of one core there, because the text was read on every look. Since then a picture that is the
  same as the last one read is not read again; what that leaves has not been measured on a real screen.
  `lookEveryMs` 0 turns it off.
- The calendar file has never been opened on a Mac by the app: `Keep.swift` is compiled and has never run. Whether
  Calendar asks before adding the entry or adds it at once is not known, so the line he hears says only that the date
  is open in his calendar. A line with a clock time becomes an entry at that time in the Mac's own time zone, since
  the pages write none. "It" is the last date shown; after an answer that named two dates it is the first of them.
- The demo's guide has run only on a tape. It has steps for two pages, the club recognition page and the Catalina
  Maymester page; the chemistry worksheet has none, since the mind cannot yet tell that page is on screen. It knows
  a step happened only from what the mind itself did: a click in Calendar, or a section opened with the date's line
  still out of view, is not seen.
- A click on a step's box has run only on a tape and in the scripted stand-in. The app reads the left button by asking
  the system for its state sixty times a second, with no event tap; that reading is compiled and has never run, and
  whether it needs a grant on his Mac is not known. A step with no date has no box to click. A click on the page
  near the boxed line for any other reason also moves the walk on.
- One sheet is measured: the second question of one chemistry worksheet. Rings on its drawing have run once live in
  the scripted stand-in and never on a real screen. The sheet is found from two of its printed lines; scrolled so
  that only one shows, it is not found and the ask is answered as before. Which places a hint may ring is bound only
  by the prompt's rule and the cap of two: no code checks that two rings together do not show the result.
- The opening line (`openingLine`, shown once by the app when it starts) has never been seen: no scripted run shows it.
- The nudge card's buttons have never been clicked on a Mac: the overlay as a panel that never makes the app active,
  its first click and the button held down are compiled and unrun. They are checked only as the boxes the picture
  offers and the lines a press stands for.
- The cue cards in the menu and the tapped ask have never been used on a Mac: `Cues.swift` and the app's `typed` are
  compiled and unrun. The scripted stand-in has run tapped asks live. The menu bar says "Lost and Found"; the app's
  file, its grants in System Settings and this repo still say paral.
- The page-to-page guide, the way line, "show me" and a click on a step's box have been walked live in the scripted
  stand-in by the second session, and are drawn on main. None has been seen on a real screen. "Show me" walks the
  steps in the order the looks found them, in the look's own words for each; a step is done when he clicks its box or
  says "show me" again, and nothing else tells it. A step's place is the line the look named for it, or the line of
  its date; a step with neither has nothing to box.
- The real windows have been started by the owner on his own Mac, twice. Seen there: the hold key, the microphone,
  the ear, the voice, and answers with marks once the screen grant was on. Not yet seen there: a circle, the cross,
  the board over real windows, a headset, and everything added since 368e4da except what the watcher cost.
- One display, chosen when the app starts. After plugging in a display or a projector, start it again.
- The pill sits above the Dock's height as the display gave it when the app started. Not seen on a real screen; if the
  Dock is moved or shown after that, start the app again.
- Every press of the hold key starts an ask, also when the key is used for typing.
- With a Bluetooth headset the start of the voice may be cut: the headset changes mode when the microphone opens and
  closes. Not tried; the Mac's own microphone and speakers avoid it.
- What leaves the Mac with the live services, on each ask: the sound of the question goes to the ear's API. While he
  holds the key, the text read off the whole screen (up to `openerPageLines` lines, no picture) and his words so far
  go to the fast model, which drafts the quick line. One scaled picture of the main display, the lines read from it,
  his words and the lesson so far go to the deep model; when he draws around something the deep model gets only that
  part of the picture and the words of the lines in it. So a circle narrows what the answer is made from, and does
  not keep the rest of the page's text on the Mac: the fast model has read it. Each sentence said goes to the
  voice's API. With a tape nothing leaves. paral keeps one temporary picture file, overwritten on each ask.
- The lesson lives for one connection. Restarting the body or the mind starts it over.
- A line he edits is treated as the same wrong line, still wrong, even when the model has moved to a later line.
- A follow-up that the model words as a new problem wipes the marks of the one before.
- The board comes before the sentences, three to five seconds after he lets go in the runs so far; nothing of the
  answer comes sooner than the reply's first fields.
- Nothing checks the quick line. The fast model writes it from the lines read off his page, without the picture,
  and it can name the wrong thing; the deep model is told the line and is asked to put it right. It is said only when
  a draft made while he talked heard enough of his question, which was about one ask in three in the live runs; the
  rest open with the fixed line. The ear runs about a second behind his voice and the fast model takes most of a
  second, so a line written from his whole question cannot be ready inside the 0.8 s mark.
- On the top rung the second look is steady for one line and erratic between lines: the same hint was passed with
  the example in k and swapped with it in x. A repeat visit to the top rung still gets only the rung's fixed line now
  and then: 1 of 8 asks in the four live runs since the last change, about one in three before it.
- What paral knows of USC beyond the screen is the pages in `pages/kept/`, read on the day each file says. It does not
  browse while it runs, and it does not know the page's address: it recognises a kept page from the lines on screen.
  A page that has changed since it was read is answered from the old text. A date it says must be on the screen or
  in a kept page, or the sentence is not said; other facts are not checked.
- One lesson exists (`balance`), with three fixed examples.
- Landing a mark on the right line is measured on generated pages only, not on real course pages.
