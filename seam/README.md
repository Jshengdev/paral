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
| `screen` | the picture (a smaller copy's path, and `w` and `h`, which are the size the lines were read at and not the size of that copy), its display, and the lines read from it. With a path drawn, the picture has it on it and is cut down to the part he drew around, and a line outside that part comes with its place and no words. It may arrive after `key.up`, and may be sent twice |
| `key.up` | he let go; carries the true moment of release |
| `close` | he closed it: the conversation ends and the ink goes |

## From the mind

| line | means |
|---|---|
| `ready` | the body's settings: the hold key, the draw key, the microphone's tail, the picture's size |
| `state` | idle, listening, thinking or failed (with the reason) |
| `heard` | his words as the ear hears them, and once more when final |
| `echo` | his own loop, to draw back at once: a box and a shape (`loop`, `ring` or `box`). It is his, so `clear` leaves it; his next key press takes it |
| `say` | one sentence, numbered by `beat`; beat -1 is the opener, and beat -2 is the fixed line said first when the opener is late. A hint carries its rung. `aside` is true for a line said while he waits (an opener, a stall line), which is no part of the answer |
| `voice` | a chunk of that sentence's sound, 16-bit PCM at 24 kHz mono, base64; `last` closes the beat |
| `words` | when each word of the beat is spoken, in seconds from the beat's first sound |
| `mute` | this answer has no voice, and why |
| `mark` | a ring, underline, wavy line, bracket or hugging box at a box, with the beat it belongs to |
| `board` | rows of boxes joined by arrows. With no rows it is an empty card, opened when he asks for a drawing; a later `board` with the same id fills it |
| `board.close` | take away an empty card, since no board is coming |
| `clip` | a lesson clip to play in the board's place: its name, the file, a first still, and its length |
| `clear` | wipe paral's marks, board and clip |

Coordinates: boxes read from a picture are in picture pixels from the picture's top-left. Boxes sent to the body are
in screen points from the top-left of the main display, y growing downward. The scene converts in one place.

Checked by: `seam` rows, and every `turn` row.
