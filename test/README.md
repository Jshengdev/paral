# test

One test file, `main.test.ts`, and one command, `./check`. A check is a row: a JSON file in `rows/` that says what
goes in and what must come out. `./check circle` runs only the rows whose name contains "circle". A filter that
matches no row fails, so a misspelling cannot pass by checking nothing.

## What a row is

```json
{ "name": "what must be true, in a sentence", "run": "which runner", "in": { }, "out": { } }
```

The name is the claim. `run` picks a runner from the table in `main.test.ts`; the runner gets `in` and must return
exactly `out`. A runner that needs more than a line lives in `runners/` (the Mac side, the turn, the adapters);
those are helpers, not test files.

| runner | what it runs |
|---|---|
| `catch`, `catch.fits`, `circle`, `ground`, `happened`, `teach`, `push`, `push.count`, `hold`, `hold.drawn`, `beats.*`, `partial`, `lesson` | one core, with values |
| `seam.read`, `seam.write` | one line through the schema |
| `settings`, `prompts`, `size` | every setting carries its reason; no prompt changed unseen; no source file too long |
| `turn` | the real mind on a tape: lines in over a socket, lines out |
| `stop` | the mind stops inside its limit while a body is linked |
| `live.standin` | the live Claude adapter against a stand-in client: the request's shape, the cap, a broken reply |
| `kept` | the kept voice over a counting stand-in: which lines call the live voice |
| `body.landing` | pages drawn, read by the Mac, and each quoted line found again |
| `body.filmed` | a whole run on a tape through `./flow` and `./film`, read back from the film's record |
| `body.capsule` | what the capsule shows at given moments of a hand-written run: its look and its note |
| `body.pressedAgain` | a run on a tape where the key is pressed again soon after a release: the order of the key lines the mind got |

Tapes in `tapes/` are recorded answers, so no row needs a key, a microphone or a screen. A tape answer keyed
`"his words @ 1,2"` is the one for those words when he drew around lines 1 and 2.

## Writing a new row

1. Write the row with `"out": null`.
2. `SHOW=1 FREEZE=1 ./check "words from its name"` prints what happened, writes it into the row, and fails on purpose.
3. Read what it wrote. If it is what must be true, the row now passes. If it is not, fix the code, set `out` back to
   null, and go again. Never freeze a row you have not read.

A bug becomes a failing row first, then the fix.

## What rows do not prove

A row on a tape proves the mind and the body agree with each other. It does not prove the services behave: that is
`./flow` on a real ask, and the exam in `exam/`. Nothing here starts the real windows.
