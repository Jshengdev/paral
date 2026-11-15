# body

Promises: the Mac side of paral. It reports what happened and draws what it is told. It holds no logic about teaching.

Three programs come from one package: `ParalBody` (everything), `paral` (the app: thin hosts around it) and
`paral-headless` (the same pieces with no window, for rows, flows and films).

## Every piece on the screen

What paral can put over a page, one row a piece. The names in the first column are the design kit's ("Lost and
Found: brand kit"); where the kit has no frame for a piece, the name is the build's and says so. The mind decides
when; the body only draws. Nothing here takes a click except the cross, and nothing here clicks.

| piece (kit's name) | what it is for | the line that brings it | what ends it | tokens |
|---|---|---|---|---|
| Voice pill (the capsule) | paral's one voice on screen: his words as they are heard, that it is working, each sentence as it is said, a failure in words. At rest it is the kit's orb at the bottom centre; at rest with paral's ink on the page, a cross that clears it, with the orb and the name to its left | `key.down` (listening), `key.up` (working), `say` with `voice` or `mute` (answering), `state` failed; a `say` with a `trail` opens it with no key | the answer's end and a short linger, then it rests; the next press takes it over | `capsule.*`, `light`, `glass`, `shadow`, `ink`, `dim`, `font`, `motion.openMs`, `motion.lingerMs`, `motion.unaskedStayMs`, `motion.standMsAWord`, `motion.readMsLeast`, `strings.*` (`strings.name` beside the cross) |
| The trail (build's name; the kit has no frame) | the steps paral took before a line it said without being asked, in small capitals above the line, each cardinal once reached | `say` with `trail` | with its line | `capsule.tagType`, `cardinal`, `motion.trailStepMs` |
| Highlight ring, and drawn notes | "this line": a ring, underline, wavy line or bracket drawn by hand in ember, with a note beside it when the mind sends one | `mark` (kind `ring`, `underline`, `wavy`, `bracket`; `label` for the note) | `clear`, a close, or a new mark on the same line | `mark.*`, `ember`, `cardinal` (the note) |
| Highlight (the box) | "this line", where lines sit too close for a ring: a thin cardinal edge and a faint wash laid along the line by the pen | `mark` (kind `box`) | `clear`, a close, or a new mark on the same line | `mark.boxWidth`, `mark.wash`, `mark.ringMs`, `cardinal` |
| Drawn arrow (the kit's, from its ring to its card) | "this line is what that is about": one curve in ember from the newest mark to whatever is speaking about it, and only where a way exists that keeps clear of every word on the page | no line of its own: the newest `mark` once the pen has finished it, while the capsule carries that mark's own `say`; or, with the capsule at rest, while the guide's card (`next`) names the marked line | goes with its mark (`clear`, a close, a newer mark); drawn back as the capsule closes; gone when the card's words move on, and while a `way` arrow is up | `lead.*`, `way.head`, `way.halo`, `ember`, `cursor.settleMs` |
| A step's mark, waiting (build's name) | "this is the step you are on; click it when it is done": the mark of a walk's step breathes, a glow of its own colour round its ink that swells and goes back, and a box's wash deepens with it | a `mark` whose `board`, with the same id, names the step (`now`) | the step moving on (the mind's `clear` and next mark, also when the next step is on the same line) or the walk ending; nothing breathes with motion reduced | `mark.breath`, `mark.breathDeep`, `mark.breathMs`, `way.nodEveryMs`, `cursor.settleMs`, `cursor.rippleMs` |
| Cursor | paral's own pointer: it shows where, never clicks. It flies to the newest mark or arrow, rides the pen, rests beside it; one ripple says "here" | the newest `mark`, `way` or `echo` on the page | goes with its mark or arrow; none with motion reduced | `cursor.*`, `cardinalDeep`, `cardinal`, `ember`, `motion.flightMs`, `motion.arc`, `motion.bounce` |
| Cursor: tag | says whose cursor is moving: a light pill with the orb and the name, worn only while it comes in from nowhere | the first `mark` or `way` after the page was clean | its arrival | `strings.name`, `light`, `glass`, `shadow`, `gold` |
| Cursor: thinking | says paral is working: the orb beside a cursor that is already on the page | `key.up`, until the answer begins | the answer's first sentence | `gold`, the cursor's reds |
| The way arrow (build's name; after the kit's drawn arrow) | the thing is on this page and not in view: which way to scroll, and its name on a tag | `way` (`to`, `toward`) | `clear`, a close, a newer `way`, or a `mark` with the same id | `way.*`, `ember`, `light`, `glass`, `shadow`, `mark.width` |
| The board (build's name; in the kit's language of card and buttons) | what is still ahead, or the parts of an answer, as boxes on a light card. On a board of steps the step he is on is the ink button | `board` (`rows`; `now` for the step) | `clear`, a close, a `clip`; the same rows again keep the card in place | `board.*`, `light`, `mist`, `ink`, `glass`, `shadow`, `motion.boardMs` |
| Toast | confirms something paral did: "Open in your calendar · November 22" beside the capsule | `open` (`label` for the date) | four seconds; a `clear` does not take it | `toast.*`, `strings.opened`, `cardinal`, `light`, `glass`, `shadow` |
| Nudge, without its buttons (the guide's card) | says what to do next for the page he is on, and which step it is, so a first run needs no one beside him. The closing line comes when every step is done | `next` (`text`, `n`, `of`; `done` for the closing line) | a `next` with no words; the closing line goes by itself after the toast's stay; a `clear` does not take it. Not drawn at all when "Show the guide" is unticked in the menu | `guide.*`, `strings.step`, `strings.name`, `toast.stayMs`, `motion.standMsAWord`, `motion.readMsLeast`, `light`, `mist`, `glass`, `shadow`, `gold` |
| The lesson clip (build's name; no frame in the kit) | a rendered clip on an example that is not his, in the board's place, on a dark card | `clip` | `clear`, a close, a `board` | `board.pad`, `board.radius`, `board.maxWidth`, `ink` |
| His own trail and his loop (build's names; they are his, not paral's) | the path of his pointer while he draws with the draw key held, and that loop drawn back by hand once his words are final | `trail` (from the body), `echo` | the trail fades as he lets go; the echo goes at his next press or when paral marks inside it | `accent` (the trail), `ember` (the echo), `mark.width`, `motion.trailFadeMs` |

Every light surface (the capsule, the board, the tags, the toast, the guide's card) is drawn by one function,
`Painter.surface`: a solid light fill (`glass` 1, so no word of the page shows through), a soft shadow, a hairline
edge in `mist`, and outside the edge a band of the surface's own colour (`band`), so the page's letters stop short
of it. A ring round a whole line of text is the kit's loop: flat above and below the words with round ends, a little
open where it began; between close lines it is flattened on each side to pass through the middle of the gap to the
nearest line, so it strikes through no word. The guide's card sits in a corner (`Layout.corner`): the top right first, below the
Mac's menu bar, then down that side, then the top left, on none of the page's read text, the marks, the board, the
arrow, the toast or the capsule. "Show the guide" is one item at the top of the menu bar's menu (`GuideSwitch.swift`),
ticked when the app starts; nothing crosses the seam for it.

Not built from the kit: the nudge card's two buttons (the builder's cue cards in the menu are that), the pill's stop
and send buttons (paral is held and let go), the cursor's click (paral clicks nothing), and the wordmark.

## Deciding what is on screen

| file | job |
|---|---|
| `Seen.swift`, `Lines.swift` | the seam on this side: every line read and written, checked at the edge |
| `Scene.swift`, `SceneTimes.swift`, `ScenePicture.swift` | events in, a `Picture` for any moment out. No clock, no drawing |
| `SceneWay.swift` | the arrow that says which way to scroll: how far the pen has inked it, and its nod |
| `ScenePointer.swift` | paral's own cursor: its flight to a mark, its ride on the pen, its rest beside the mark and the ripple there |
| `Picture.swift` | what is on screen at one moment, as plain values |
| `Layout.swift` | where the capsule sits, the largest empty place for a board, the place at an edge for the way arrow, and where the cursor rests beside a mark |
| `Motion.swift` | the curves: ease, land, spring, arc |
| `Pen.swift` | the path the pen takes for each kind of mark |
| `PenWay.swift` | the strokes the pen makes for the two drawn arrows: a shaft, then a head |
| `SceneBreath.swift` | the mark of a walk's step, which breathes while it waits for his click |
| `SceneLead.swift` | the arrow from a mark to what speaks about it: which mark has one, what it leads to, how far it is inked |

## Drawing it

| file | job |
|---|---|
| `Painter.swift` and `Painter*.swift` | draw a picture into any drawing context, with the tokens |
| `PainterLead.swift` | finds the way the arrow from a mark takes to what speaks about it, and inks it |
| `Tokens.swift`, `tokens.json` | the look in one file: colour, type, sizes, motion times |

## Hosts (real windows only)

| file | job |
|---|---|
| `Key.swift` | the hold key and the draw key, read by asking the system for the keys' state. No event tap |
| `Mic.swift` | the microphone as 16 kHz chunks, only while the key is held |
| `Speaker.swift` | plays the voice as it arrives; drops what is waiting at the next key press |
| `Screen.swift` | one picture of a display without paral's own window, the lines read from it, his path drawn on it |
| `Overlay.swift` | one see-through window above everything that lets every click through, except the cross |
| `Wire.swift` | the socket to the mind; reconnects when the mind restarts |
| `Watch.swift` | looks at the display with no key pressed and reports a look when what it read has changed and stood still. Never run |
| `Release.swift` | the end of a hold: the microphone's grace after the key is let go, and a new press that ends the hold before it first. Used by the app and by the scripted flow |

## With no window

| file | job |
|---|---|
| `Flow.swift` | plays a scripted run against the real mind: key, sound, pointer path, a picture of a page |
| `Film.swift` | replays a recorded run into frames, a voice track and a list of where each thing was drawn |
| `FilmPages.swift` | the pages of a recorded run and when each came up, so the frames are drawn over the page that was on the screen |
| `Page.swift` | draws a page of text lines, for rows |

A flow file (`./flow RUN/flow.json`) is `display` (`id`, `scale`, `x`, `y`, `w`, `h`), `page` (a picture of the page),
optionally `fault` (`"voice"`), and `asks`. An ask is `wav` (the sound of the question), `trail` (the pointer's path
as `[ms from the key going down, x, y]`, empty for none) and `startAfter`, or `{ "close": true }` for a click on the
cross. `startAfter` says when the key goes down for an ask after the first:

| `startAfter` | the key goes down |
|---|---|
| `"idle"` | half a second after the ask before it has finished |
| `{ "firstSayPlusMs": N }` | N ms after the first line of the ask before it is said: a cut-in |
| `{ "firstAnswerPlusMs": N }` | N ms after the first sentence of its answer, not a line said while he waits |
| `{ "releasePlusMs": N }` | N ms after the key was let go; under 300 it is inside the microphone's grace |

A step with `"look": true` in place of a `wav` is a look with no key pressed: what the app's watcher sends by itself. `"page": PATH` on any step puts another page on the screen from that step on (he clicked, scrolled or opened a section), and `"waitMs": N` is how long a look step waits before the next one (6000 if left out). A flow with `"live": true` is walked a step at a time by whoever writes the file: when the steps so far are played it waits for another to be added, and `"end": true` closes it. Any other flow ends with its last step.

## The way arrow

A `way` line is drawn as a tag with the name of what it leads to (`toward`) and a hand-drawn arrow that leaves the tag
and turns toward the edge he must scroll to. The tag is up the moment the line arrives; the cursor flies to it and
the pen then inks the arrow (with motion reduced it is whole at once). After that it nods toward the edge every few
seconds and is otherwise still, so the overlay is not redrawn all the time he reads. Its place has room beside the
arrow for the cursor to rest. It sits at that
edge: at the bottom beside the open capsule, at the top in the middle, or the nearest place to that which is on none
of the page's read text, the capsule, the board or the clip (`Layout.way`). Where the edge is full of text it moves
in from the edge rather than cover any, up to a third of the display. There is one arrow at a time: a newer `way`
takes the place of the one before, and `clear` or a close wipes it. While it is up the resting circle carries the
cross. Its looks are the `way` group and `ember` in `tokens.json`. Its shape is after the drawn arrow of the design
kit ("Lost and Found: brand kit", page 08), drawn here in code; no picture is loaded.

## The arrow from a mark to what speaks about it

The design kit's page 08 draws one curve from the ring round a line to the card that speaks about it. Here the scene
says which mark has one and what it leads to (`SceneLead.swift`) and the painter finds its way (`PainterLead.swift`);
nothing crosses the seam for it.

- **One at a time.** Only the newest of paral's marks on the page has an arrow, never his own loop, and none is drawn
  while the arrow that says which way to scroll is up.
- **What speaks.** The capsule, whenever it carries that mark's words: the arrow comes when the mark's own sentence
  comes up in the capsule, stays while the capsule holds that answer's words, and is drawn back as the capsule
  closes. The guide's card says what he does next, which is seldom about the marked line ("Say it again: show me"),
  so it is led to only once the capsule is at rest and only when its words name the very line that is marked: the
  whole of a read line the mark is on is among the card's words ("Open Deadlines", with the mark on "Deadlines"). The
  body can tell no more than that from the lines it is sent; in every other case there is no arrow.
- **When.** It is inked once the pen has finished the mark and the cursor has stepped aside (`cursor.settleMs`), in
  `lead.drawMs` (700: a hand's one sweep; chosen, not measured), and it is whole at once with motion reduced.
- **Its ink never covers the page's words.** A way is refused when its ink or its paper edge comes within
  `lead.clear` (4 points) of any read line, the line it leaves among them. It is refused too when it lies on the
  mark, the resting cursor, the board, the clip, the way arrow, the toast or the other speaker, or off the display,
  and when it is longer than `lead.longest` (1000 points: on the recorded club page the ways down the right margin
  to the capsule run 590 to 920). Where no way is left, no arrow is drawn: a missing arrow is fine, an arrow over
  words is not.
- **Its way.** It begins straight out from the mark's edge, on the far side of the cursor where the cursor rests
  there, and stops `lead.gap` (8, the kit's arrow stops about that short of its card) from what it leads to. From
  there it may set off straight out, as the kit's bow does, or turned by up to a quarter turn, which is what lets it
  run down a margin too narrow for a bow; of the ways that are clear, the shortest and the nearest the kit's plain
  bow wins. The way is found once and kept while nothing it depends on moves.
- **Its shape.** One bow after the kit's drawn arrow, whose curve was measured: pulled out 0.37 of the straight way
  the way it leaves, and arriving turned as far to the other side, pulled back 0.32; then the head, with the way
  arrow's barbs (`way.head`) and paper edge (`way.halo`). Its ink is `lead.width` across (2.5): the kit draws its
  arrow at the ring's 3.5, a third of a card long; here it can run the height of the page, and at the ring's weight
  a stroke that long takes the eye from the box it starts at.

## The capsule, the board and the tags on the kit's light surface

The capsule has the look of the design kit's voice pill within the states it already had: a light pill with a soft
shadow and words in ink. At rest it is collapsed to the kit's orb. While paral's ink is on the page it rests as a
cross that clears the ink, and since a cross alone over a line of the page reads as a stray button, it wears the
resting orb and `strings.name` to its left, small (`capsule.tagType`), so it is plain whose cross it is. The cross
keeps its place: a click is taken on the cross's own circle and nowhere else, so the name takes no click. The room
for the name opens as the capsule shuts, and the name is written from the cross leftward, so it does not slide.
Listening, a small wave stands before his words, which are grey while still being heard and black once settled.
Answering, the words to come are grey and settle to black as they are said; the steps of a look's trail are cardinal
once reached. The kit's pill also has a stop and a send button and keeps its transcript in a bar of its own above the
pill; paral is held and let go, so there are no buttons, and the transcript is in the pill. The board is a card of
the same light surface: a box is the kit's quiet button (`mist`, written in ink) and the step he is on its main
button (ink, written in white). The way arrow's tag, the cursor's tag and the toast are the same surface. `glass` is
how solid it is and `shadow` how far its shadow spreads. The kit fills at 0.85 over a blur of the page; the overlay
cannot blur what is under it, so `glass` is 1. Only the lesson clip keeps its dark card. Page 06 of the kit, the
voice pill's own page, could not be read on the night this was made (the design tool stopped answering); the look
is from the one pill on page 08 and a one-line account of its states, and where it guesses it says so here: the
orb at rest, the wave's shape, and the transcript inside the pill.

## A line stands a least time

Where one line takes the place of another, in the capsule or on the guide's card, the one before has stood a least
time first, and the newer waits its turn; none is passed over. The time is `motion.standMsAWord` for each word (200:
two seconds for a line of ten words, which is the lead's measure for a line to be taken in, not a reading time) and
never less than `motion.readMsLeast` (1200, the least any line is given). It is decided in the scene as lines
arrive, so the windows and the films agree.

- **The guide's card.** A `next` line is shown when it comes, or when the line before it has stood. A `next` with no
  words takes the card away the same way, once its line has stood; a line that comes after an empty card comes at
  once. The card's closing line counts its stay from when it is shown.
- **A line said without being asked.** It comes up in the capsule once the line the capsule holds has stood its
  time, and after every such line still waiting for its own turn. Its reading time and its stay run from then. Its
  mark is not held: the pen draws it when it arrives.
- **An answer said aloud.** Each sentence's words come up with its voice, and not before the sentence before it has
  stood. A sentence takes longer to say than to stand unless it is a word or two ("One moment." is half a second
  of voice and stands 1.2), so the words run behind the voice only after such a one, and by no more than its
  standing time less its speaking time; the words already said are bright the moment they come up. The voice, the
  marks and the board keep the voice's own times.

## Type and ink, after the design kit

Everything is written in the typeface the `font` token names (the kit's DM Sans), at the optical size in
`fontOptical` where the family has one (the kit's 14). `Faces.swift` makes each size and weight once. When the Mac
does not have the family the system's font is used and that is said once on the error stream; nothing is downloaded.
An empty `font` asks for the system's font. `ink` is the kit's #141414. `paper` stays white: in the kit, paper
#F4F4F4 is for page backgrounds, and what it writes on ink is white.

## Marks and the cursor, after the design kit

The seam's mark kinds are unchanged; the kit's look comes through tokens. A ring, an underline, a wavy line and a
bracket are drawn by hand in `ember`. A box is the kit's neat highlight: a thinner edge (`mark.boxWidth`) in
`cardinal` and a faint wash of cardinal inside it (`mark.wash`, the kit's 8 percent), laid across the line from its
start as the edge is drawn, the way a highlighter is pulled along. The wash tints the words and does not hide them.
No mark's ink leaves the display: where the thing it marks runs to an edge of the display or past it (a line as wide
as the page), the pen's path runs along that edge, `mark.pad` in, so a loop is still seen to close. His own loop
coming back is kept inside the same way.

The pointer is the kit's cursor: an arrow filled from `cardinalDeep` through `cardinal` to `ember` with a paper edge,
its outline written in `PainterCursor.swift` from the corners of the kit's shape. It flies to where the newest mark
starts (from the capsule the first time, from wherever it was after that), rides the pen while the mark is drawn,
then steps aside to rest just beside the mark on none of the page's read text (`Layout.beside`: to the right of the
mark first), and a ripple spreads from it once. It points and never clicks: it is ink in the overlay, which lets
every click through. It comes for a mark with no key pressed too (a look's mark), stays for as long as its mark is
on the page, and goes with it on a clear or a close. With motion reduced there is no cursor. It is never drawn off
the display: where a mark or an arrow runs to an edge, the cursor is moved the least that keeps all of it on the
display, so its tip leaves the pen for the last few points of such a stroke; its name tag is kept on the same way,
and then sits level with the cursor and not under its tail. While it comes in from
nowhere (its flight and its ride on the pen) it wears the kit's name tag, a light pill with the orb and
`strings.name`, so he can tell whose cursor is moving; at rest it wears nothing. While the capsule says paral is
working, a cursor that is on the page wears the kit's orb. The orb is drawn in code as rings of the cursor's reds
and one of `gold`; the kit's own orb is a picture and is not loaded. His own loop comes back drawn by hand in ember
whatever its shape, with no wash: the wash is the kit's highlight for one line, and he may have circled a table.

## A walk through steps ("show me")

The body draws a walk and decides nothing of it; the steps and when they move on come from the mind. A `board` line
with `now` is a board of steps: the row with that number is lit (its box filled with the card's chalk and written in
the card's ink) and the others stay as they are. The same rows coming again within a tenth of a second of a `clear`
are the same card: it does not fade in a second time, and it stays where it is unless the page has moved and put
text there. With the step's line in view the mind sends a `mark`, and the cursor goes to it. With it out of view the
mind sends a `way`, and the cursor goes to the arrow: it flies to the tag, the pen inks the arrow once it is there,
and it rests beside the arrow. That is how it leads from one place to the next. From an arrow it sets off again from
the capsule, since the scene does not know where the painter put the arrow.

A click on the step's box moves the walk on, so the mark of the step he is on waits for him and says so by breathing
(`SceneBreath.swift`). The mind sends nothing for it: a walk's mark is a mark whose board names the step. It is
still while the pen draws it; its first breath comes when the cursor has stepped aside and its ripple has spread
(`cursor.settleMs`, `cursor.rippleMs`: about a second after the ink is whole, so he sees it before he clicks; on the
recorded walk his clicks came three seconds apart), and one more follows each rest, which is the way arrow's
(`way.nodEveryMs`), so the two signs that something waits for him keep one rhythm. A breath lasts
`mark.breathMs` (1400, twice the arrow's nod: in and out alike and slow at both ends, where the nod is a quick dip).
It is a glow of the mark's own colour round its ink, `mark.breath` points wide at its top (5: it reaches into the gap
to the lines above and below and moves no ink, so nothing has to make room for it) and `mark.breathDeep` strong (0.25:
the words under it still read); a box's wash deepens to the same and comes back. All three are chosen on stills, not
measured on a screen. On every step the mind clears and sends the mark again, also when the next step is on the same
line (on the club page steps 1 and 2 are), and the body draws it again with the pen and starts its breath from that
ink: the redraw is what tells him the click took. The film's record names each breath (`breath`, with the mark's id).

## A film follows the page

A step of a flow may put another page on the screen. The film draws each frame over the page that was up at that
moment: the record's `look` and `screen` lines carry the page's smaller copy, which the flow names by the page's
number (`FilmPages.sentAs`). For a run of more than one page the film also writes the bare picture of each later
page as `frames/bare-1.png`, `frames/bare-2.png`, in the order they come up, and `frames/pages.json`, one entry a
page: `{"page": N, "fromFrame": F}`, where F is the first frame drawn over that page (frame 0 for the first). A run
of one page writes what it always wrote. `frame` draws over the page of its moment too.

## The toast

An `open` line (a date opened in his calendar) shows a toast for four seconds, after the design kit's: a light pill
with a soft shadow, a cardinal badge with a tick, and `strings.opened` ("Open in your calendar"; it does not say
"added", since whether Calendar asks first is not known). It sits at the bottom edge beside the capsule and level
with it, on none of the page's read text, the board or the way arrow. It is not ink on the page: a clear does not
take it and it brings no cross. It is not blurred behind as the kit's is, since the overlay cannot see the page.

A film's record (`drawn.jsonl`) says of each board, in `type`, the size its words were drawn at in points: the
tokens' size times whatever the card was shrunk by.

`paral-headless` commands: `read`, `smaller`, `page`, `lines`, `keys SECONDS NAME` (watch a key), `flow`, `film`,
`frame RUN TOKENS MS OUT.png` (one moment of a run, for the dials page), `capsule RUN TOKENS MS...` (what the capsule
shows at those moments), `placed RUN TOKENS MS...` (where the painter puts each thing at those moments, the points
the pen has inked of a mark and of a drawn arrow, the capsule's look and words, and the way arrow's, the cursor's and the board's own values).

Checked by: `body.landing`, `body.filmed`, `body.capsule`, `body.pressedAgain`, `body.way`, `body.cursor`, `body.steps`, `body.pages`, `body.toast`, `body.boardType`, `body.guide`, `body.lead`, `body.breath`, `body.stands`, `body.resting`, `body.cursorInside` and `body.inkInside` rows, with no window. The hosts are compiled and have never been run:
the key, the microphone, the screen picture and the overlay wait for a person and their grants (`./run`).
