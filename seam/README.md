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
| `close` | he closed it: the conversation ends and the ink goes |

## From the mind

| line | means |
|---|---|
| `ready` | the body's settings: the hold key, the draw key, the microphone's tail, the picture's size, the room left around a mark (`markPad`), and how much of the picture goes when he draws around something (`cropAround`) |
| `state` | idle, listening, thinking or failed (with the reason) |
| `heard` | his words as the ear hears them, and once more when final |
| `echo` | his own loop, drawn back as soon as his words are final (the ear takes about 0.4 s after the release): a box and a shape (`loop`, `ring` or `box`). It is his, so `clear` leaves it; his next key press takes it |
| `say` | one sentence, numbered by `beat`; beat -1 is the opener, and beat -2 is the fixed line said first when the opener is late. A hint carries its rung. `aside` is true for a line said while he waits (an opener, a stall line), which is no part of the answer |
| `voice` | a chunk of that sentence's sound, 16-bit PCM at 24 kHz mono, base64; `last` closes the beat |
| `words` | when each word of the beat is spoken, in seconds from the beat's first sound |
| `mute` | this answer has no voice, and why |
| `open` | a calendar file (.ics) the mind has written for a date he asked to keep; the app opens it in his calendar app and clicks nothing there. The scene shows nothing for it, and the scripted stand-in does not open it |
| `mark` | a ring, underline, wavy line, bracket or hugging box at a box, with the beat it belongs to |
| `way` | in place of a mark, when the thing is on this page and neither its line nor its heading is in view: `to` is `up` or `down`, `toward` names what it leads to ("Deadlines"). `clear` wipes it, as it wipes a mark |
| `board` | rows of boxes joined by arrows. On a board of steps, one to a row, `now` is the number of the row (from 0) he is on. With no rows it is an empty card, which a later `board` with the same id fills; the mind sends an empty one only when `drawingAsks` holds words, and as set it holds none |
| `board.close` | take away an empty card, since no board is coming |
| `clip` | a lesson clip to play in the board's place: its name, the file, a first still, and its length |
| `clear` | wipe paral's marks, board and clip |

Coordinates: boxes read from a picture are in picture pixels from the picture's top-left. Boxes sent to the body are
in screen points from the top-left of the main display, y growing downward. The scene converts in one place.

Checked by: `seam` rows, and every `turn` row.
