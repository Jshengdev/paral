# body

Promises: the Mac side of paral. It reports what happened and draws what it is told. It holds no logic about teaching.

Three programs come from one package: `ParalBody` (everything), `paral` (the app: thin hosts around it) and
`paral-headless` (the same pieces with no window, for rows, flows and films).

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
| `PenWay.swift` | the strokes the pen makes for the way arrow: its shaft, then its head |

## Drawing it

| file | job |
|---|---|
| `Painter.swift` and `Painter*.swift` | draw a picture into any drawing context, with the tokens |
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

A step with `"look": true` in place of a `wav` is a look with no key pressed: what the app's watcher sends by itself. `"page": PATH` on any step puts another page on the screen from that step on (he clicked, scrolled or opened a section), and `"waitMs": N` is how long a look step waits before the next one (6000 if left out).

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

## Marks and the cursor, after the design kit

The seam's mark kinds are unchanged; the kit's look comes through tokens. A ring, an underline, a wavy line and a
bracket are drawn by hand in `ember`. A box is the kit's neat highlight: a thinner edge (`mark.boxWidth`) in
`cardinal` and a faint wash of cardinal inside it (`mark.wash`, the kit's 8 percent). The wash tints the words of
the line and does not hide them.

The pointer is the kit's cursor: an arrow filled from `cardinalDeep` through `cardinal` to `ember` with a paper edge,
its outline written in `PainterCursor.swift` from the corners of the kit's shape. It flies to where the newest mark
starts (from the capsule the first time, from wherever it was after that), rides the pen while the mark is drawn,
then steps aside to rest just beside the mark on none of the page's read text (`Layout.beside`: to the right of the
mark first), and a ripple spreads from it once. It points and never clicks: it is ink in the overlay, which lets
every click through. It comes for a mark with no key pressed too (a look's mark), stays for as long as its mark is
on the page, and goes with it on a clear or a close. With motion reduced there is no cursor.

## A walk through steps ("show me")

The body draws a walk and decides nothing of it; the steps and when they move on come from the mind. A `board` line
with `now` is a board of steps: the row with that number is lit (its box filled with the card's chalk and written in
the card's ink) and the others stay as they are. The same rows coming again within a tenth of a second of a `clear`
are the same card: it does not fade in a second time, and it stays where it is unless the page has moved and put
text there. With the step's line in view the mind sends a `mark`, and the cursor goes to it. With it out of view the
mind sends a `way`, and the cursor goes to the arrow: it flies to the tag, the pen inks the arrow once it is there,
and it rests beside the arrow. That is how it leads from one place to the next. From an arrow it sets off again from
the capsule, since the scene does not know where the painter put the arrow.

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
shows at those moments), `placed RUN TOKENS MS...` (where the painter puts each thing at those moments, and the way
arrow's, the cursor's and the board's own values).

Checked by: `body.landing`, `body.filmed`, `body.capsule`, `body.pressedAgain`, `body.way`, `body.cursor`, `body.steps`, `body.pages`, `body.toast` and `body.boardType` rows, with no window. The hosts are compiled and have never been run:
the key, the microphone, the screen picture and the overlay wait for a person and their grants (`./run`).
