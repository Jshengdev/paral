# dials

Promises: one page where every colour, size and motion time paral draws with can be turned by hand and seen at once.

- `./tune` starts it and prints the address (`http://127.0.0.1:4173`). It opens no window itself.
- The dials are built from `body/tokens.json` when the page loads: a number is a slider, a colour is a colour, a word
  is a text field, a switch is a switch, and a group is a folder. A new token shows up by itself.
- Turning a dial saves the whole look back to `body/tokens.json`. That file is the page's only memory; nothing is kept
  in the browser.
- The picture is one moment of a recorded run, drawn again by the real painter (`paral-headless frame`), so what you
  see is what paral draws. "Run" picks the recording, "Moment" moves through it, "Play" steps it forward.
- A running paral reloads the file within half a second, so the same dial moves the real overlay.

The server (`serve.ts`) listens on this Mac only. It refuses a look that is not the same shape as the one on disk:
the same keys, each the same kind of value, and a colour as six hex digits.

## What you need first

A recorded run under `tmp/dev/` or `tmp/runs/`. `./flow RUN/flow.json` makes one; the exam's `prepare` writes the
flow files. With none, the page says so.

## Known limits

- Each frame starts the headless program again, which takes about a quarter of a second, so "Play" is a slide show
  and not a film. `./film` makes the real film.
- The lesson clip takes its colours from the tokens when it is rendered. After a colour change the next start of the
  mind renders the clips again (seconds each).
- The ranges of the sliders are guessed from each token's name and value, in `index.html`.

DialKit is by Josh Puckett, MIT; its licence is in `vendor/dialkit/`.

Checked by: the server's answers by hand (the runs, a frame, a save, and the three refusals), and the page drawn once
by a browser with no window. No row runs it.
