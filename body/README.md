# body

Promises: the Mac side of paral. It reports what happened and draws what it is told. It holds no logic about teaching.

Three programs come from one package: `ParalBody` (everything), `paral` (the app: thin hosts around it) and
`paral-headless` (the same pieces with no window, for rows, flows and films).

## Deciding what is on screen

| file | job |
|---|---|
| `Seen.swift`, `Lines.swift` | the seam on this side: every line read and written, checked at the edge |
| `Scene.swift`, `SceneTimes.swift`, `ScenePicture.swift` | events in, a `Picture` for any moment out. No clock, no drawing |
| `Picture.swift` | what is on screen at one moment, as plain values |
| `Layout.swift` | where the capsule sits, and the largest empty place for a board |
| `Motion.swift` | the curves: ease, land, spring, arc |
| `Pen.swift` | the path the pen takes for each kind of mark |

## Drawing it

| file | job |
|---|---|
| `Painter.swift` and `Painter*.swift` | draw a picture into any drawing context, with the tokens |
| `Tokens.swift`, `tokens.json` | the look in one file: colour, type, sizes, motion times |

## Hosts (real windows only)

| file | job |
|---|---|
| `Key.swift` | the hold key and the draw key, read by asking the system for the keys' state. No event tap. A press inside the 0.3 s after a release ends that hold first (`paral/main.swift`) |
| `Mic.swift` | the microphone as 16 kHz chunks, only while the key is held |
| `Speaker.swift` | plays the voice as it arrives; drops what is waiting at the next key press |
| `Screen.swift` | one picture of a display without paral's own window, the lines read from it, his path drawn on it |
| `Overlay.swift` | one see-through window above everything that lets every click through, except the cross |
| `Wire.swift` | the socket to the mind; reconnects when the mind restarts |

## With no window

| file | job |
|---|---|
| `Flow.swift` | plays a scripted run against the real mind: key, sound, pointer path, a picture of a page |
| `Film.swift` | replays a recorded run into frames, a voice track and a list of where each thing was drawn |
| `Page.swift` | draws a page of text lines, for rows |

`paral-headless` commands: `read`, `smaller`, `page`, `lines`, `keys SECONDS NAME` (watch a key), `flow`, `film`,
`frame RUN TOKENS MS OUT.png` (one moment of a run, for the dials page), `capsule RUN TOKENS MS...` (what the capsule
shows at those moments).

Checked by: `body.landing`, `body.filmed` and `body.capsule` rows, with no window. The hosts are compiled and have never been run:
the key, the microphone, the screen picture and the overlay wait for a person and their grants (`./run`).
