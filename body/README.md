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
| `Picture.swift` | what is on screen at one moment, as plain values |
| `Layout.swift` | where the capsule sits, the largest empty place for a board, and the place at an edge for the way arrow |
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
and turns toward the edge he must scroll to. The pen inks it when the line arrives; after that it nods toward the
edge every few seconds and is otherwise still, so the overlay is not redrawn all the time he reads. It sits at that
edge: at the bottom beside the open capsule, at the top in the middle, or the nearest place to that which is on none
of the page's read text, the capsule, the board or the clip (`Layout.way`). Where the edge is full of text it moves
in from the edge rather than cover any, up to a third of the display. There is one arrow at a time: a newer `way`
takes the place of the one before, and `clear` or a close wipes it. While it is up the resting circle carries the
cross. Its looks are the `way` group and `ember` in `tokens.json`. Its shape is after the drawn arrow of the design
kit ("Lost and Found: brand kit", page 08), drawn here in code; no picture is loaded.

`paral-headless` commands: `read`, `smaller`, `page`, `lines`, `keys SECONDS NAME` (watch a key), `flow`, `film`,
`frame RUN TOKENS MS OUT.png` (one moment of a run, for the dials page), `capsule RUN TOKENS MS...` (what the capsule
shows at those moments), `placed RUN TOKENS MS...` (where the painter puts each thing at those moments, and the way
arrow's own values).

Checked by: `body.landing`, `body.filmed`, `body.capsule`, `body.pressedAgain` and `body.way` rows, with no window. The hosts are compiled and have never been run:
the key, the microphone, the screen picture and the overlay wait for a person and their grants (`./run`).
