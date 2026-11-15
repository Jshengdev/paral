# seam

Promises: one schema for every line between body and mind (`schema.ts`), newline-delimited JSON, each with `v` and
`type`. `read` refuses a bad line and names the field; `write` checks a line on the way out. The wire only grows.

## From the body

| line | means |
|---|---|
| `hello` | a body has connected |
| `key.down` | he pressed the hold key |
| `mic` | a chunk of sound, 16-bit PCM at 16 kHz mono, base64 |
| `trail` | where the pointer is while he draws, in screen points |
| `screen` | the picture (a smaller copy's path, and `w` and `h`, which are the size the lines were read at and not the size of that copy), its display, and the lines read from it. With a path drawn, the picture has it on it and is cut down to the part he drew around, and a line outside that part comes with its place and no words. It may arrive after `key.up`, and may be sent twice: the app sends the whole display as the key goes down, and the part he drew around again at the release. The mind answers from the last one; the quick line is drafted from the lines of the first |
| `look` | the same fields as `screen`, sent with no key pressed when what is on the display has changed and then stood still. The mind acts on it only when the screen is a page it has kept |
| `key.up` | he let go; carries the true moment of release |
| `click` | he pressed the left button at `x`, `y` (display points). The mind uses it only to see a click on the box of the step it is showing; it is kept nowhere and sent nowhere |
| `typed` | an ask whose words were tapped or typed, not spoken: its `text` is asked exactly as a hold that heard those words, with no ear. A `screen` line follows it, as after a press |
| `close` | he closed it: the conversation ends and the ink goes |

## From the mind

| line | means |
|---|---|
| `ready` | the body's settings: the hold key, the draw key, the microphone's tail, the picture's size, the room left around a mark (`markPad`), and how much of the picture goes when he draws around something (`cropAround`). It may also carry `lookEveryMs` (how often to look with no key pressed) `lookFastMost` (while an arrow says the thing is off screen the body sends a look as soon as the page changes, this many rounds in a row at most), `cues` (groups of lines he can tap in the menu instead of saying them) and `opening` (one line the app shows once when it starts) |
| `state` | idle, listening, thinking or failed (with the reason) |
| `heard` | his words as the ear hears them, and once more when final |
| `echo` | his own loop, drawn back as soon as his words are final (the ear takes about 0.4 s after the release): a box and a shape (`loop`, `ring` or `box`). It is his, so `clear` leaves it; his next key press takes it |
| `say` | one sentence, numbered by `beat`; beat -1 is the opener, and beat -2 is the fixed line said first when the opener is late. A hint carries its rung. `aside` is true for a line said while he waits (an opener, a stall line), which is no part of the answer. A line said without being asked carries `trail`, the steps taken to get to it, and `keep: true` when it shows a date he can ask to keep: the body may then offer a button, which sends the `typed` line "add it to my calendar". Any line may carry `offer`, one thing it offers to do: the button's `label` and the words the body `send`s as a `typed` line when it is pressed |
| `voice` | a chunk of that sentence's sound, 16-bit PCM at 24 kHz mono, base64; `last` closes the beat |
| `words` | when each word of the beat is spoken, in seconds from the beat's first sound |
| `mute` | this answer has no voice, and why |
| `open` | a calendar file (.ics) the mind has written for a date he asked to keep; the app opens it in his calendar app and clicks nothing there. The scene shows nothing for it, and the scripted stand-in does not open it. `label` is the date in a few words ("November 22") for the body to show |
| `go` | a page of USC's he asked to be taken to (`url`, with a `label` for a toast): the app opens it in his browser, and only when it is an https address of a usc.edu site. The scene and the stand-in open nothing |
| `mark` | a ring, underline, wavy line, bracket or hugging box at a box, with the beat it belongs to. Three more kinds, sent by the mind only once the body draws them: `tick` (this line is done), `strike` (this has passed; the one mark that crosses words) and `tag` (a chip of two or three words, `label`, beside the line, in a `tone`: `strong` for what is next, `quiet` for done or passed, `date` for a count of days). `spot: true` marks a place of a drawing, not a line: no arrow leads from it and the cursor does not go to it |
| `way` | in place of a mark, when the thing is on this page and neither its line nor its heading is in view: `to` is `up` or `down`, `toward` names what it leads to ("Deadlines"). `clear` wipes it, as it wipes a mark |
| `scroll` | he asked to be scrolled to what the arrow points at ("scroll for me", said or pressed): `to` is `up` or `down`, `toward` names it. The app scrolls the page that way for him, a little at a time, and stops when the arrow goes (the mark has landed, or a clear) or after `Scroll.longest`. It needs his Accessibility grant, asks for it once, and says so when it has none. The scene shows nothing for it |
| `board` | rows of boxes joined by arrows. On a board of steps, one to a row, `now` is the number of the row (from 0) he is on. With no rows it is an empty card, which a later `board` with the same id fills; the mind sends an empty one only when `drawingAsks` holds words, and as set it holds none |
| `board.close` | take away an empty card, since no board is coming |
| `clip` | a lesson clip to play in the board's place: its name, the file, a first still, and its length |
| `clear` | wipe paral's marks, board and clip |
| `next` | the demo's guide: what to do next on the page on his screen (`text`), step `n` of `of`. Sent when that changes. An empty `text` means no card; `done` is true on the one line sent when every step has happened. `clear` leaves it |

Coordinates: boxes read from a picture are in picture pixels from the picture's top-left. Boxes sent to the body are
in screen points from the top-left of the main display, y growing downward. The scene converts in one place.

Checked by: `seam` rows, and every `turn` row.
