# lessons: a short rendered clip for a hard idea

Some ideas are easier seen than said. A lesson is a few seconds of motion that shows one idea, on numbers that are
not the student's own. It is the top rung of the ladder (a worked step of the same kind) drawn instead of written.

## What it promises

- `render(name, data, signal?)` in `render.ts` gives back `{ clip, still, cached }`: an `.mp4`, a first still as a
  `.png`, and whether it was already rendered. The same data always gives the same folder under `tmp/lessons/`, so a
  lesson is rendered once.
- `shape.ts` lists every lesson and the data it takes. Data that does not fit is refused, with the field named.
- A lesson never holds the student's result. It is a parallel example, and the mind's Push checks its data like any
  other line before it is shown.
- From a shell: `node lessons/render.ts balance '<json>'`.

## The lessons

| Name | The idea | Its data |
|---|---|---|
| `balance` | An equation is a balance: add the same to both sides and it stays level | the two sides, what is added, the two sides after, three short captions, and three colours |

## How it is made

Each lesson is one composition for raea (raea.io), a render engine that draws React compositions on the GPU. A
composition is a function of the frame: frame N in, picture N out. So a lesson is repeatable, and it can be checked
one still at a time.

- Measured on this Mac, 2026-11-14: the first render after a start took 17 s, and the next took 2.5 s for the still
  and the 8 s clip together. One run each, so a first look, not a number to plan on.
- The colours come in as data, from the app's design tokens, so a lesson changes with the look.

## Adding a lesson

1. Write `NAME.tsx`: a raea composition that imports its data from `./lesson.gen` and reads `useCurrentFrame()` for
   everything that moves. Keep text large (54 px at 960 wide) and give each caption a second to be read.
2. Add its data to `shape.ts`.
3. Render stills first and look at them: `raea render NAME.tsx --at 10,60,120 -o frames/` in a scratch folder.
4. Add a scenario in `exam/` that asks for it.

## Not checked

- No row or scenario runs a lesson yet. Rendering needs raea installed (`raea --version`), and the app must still
  answer in words when it is not.
- raea's licence is FSL-1.1 (source available, not for a competing product). It is used here as a tool, like ffmpeg.

## Borrowed from

- raea's own guides: frame-pure compositions, text sizes and reading time (`raea guide craft`).
- DuckyHelper's blackboard, which draws beside the work; Roamies' cards, which are data and not code.
