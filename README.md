# paral

A helper that sits on a student's own screen, called Lost and Found. On USC pages it has read ahead of time it
speaks first: it marks the one thing on the page that will cost the student later (a deadline folded away in a
closed section), says it once, and offers to put the date in their calendar, scroll to it, or open the section.
Hold a key and ask out loud, and it marks the place on the page and answers in short sentences that stay on a card.
On the student's own work, when a line is wrong, it gives one hint at a time and never the answer.

What it sees, sends and keeps: it takes a picture of one display, reads the text off it on the Mac, and sends the
sound of a question, one scaled picture and the lines read to the two services named below, only when the key is
held or a line is tapped. A look it takes by itself sends nothing from the screen. It keeps one temporary picture
and no history. It acts in another app only when asked: it opens a usc.edu page, scrolls, or clicks one closed
heading it has itself marked.

Built at the AI@USC hackathon, November 14-15 2026.

## See it

No video yet. It will be cut from a recorded take of the real app.

## Run it

Needs macOS 14 or later, the Xcode command line tools and Node 26. Keys for Claude and Cartesia go in
`~/.config/paral/keys.env`; `keys.env.example` lists the names. No key lives in this folder.

```
npm install
./check     # builds the Mac side and runs every row; needs no key, microphone or screen
./run       # lists the grants macOS will ask for (microphone, screen; Accessibility only if you ask it to scroll or open), then starts paral
./tune      # a page of dials for every colour, size and motion time
```

Hold the right Option key, ask, and let go. Hold Shift as well to draw around something.

## How we know it works

- `./check` runs one test file over the rows in `test/rows/`. Each row states one thing that must be true.
- `exam/` is a separate judge. It plays scripted asks through the real services, films what paral draws, and reads
  the film and the record against a list of what paral must do.
- On a real screen, on its owner's Mac on November 15: the first look on six USC pages, spoken questions answered,
  the walk through three steps by clicks, rings on a worksheet's atoms, marks that leave while the page moves and come
  back when it stops, and one uncut take from an empty tab. Not yet seen on a real screen, since each needs a person
  at it: "Scroll for me", "Open it for me", "Take me there", the notes page, and "Add to calendar" pressed.

## Built with

Swift (AppKit, ScreenCaptureKit, Vision, AVFoundation) for the Mac side. TypeScript on Node for the mind, with zod
and the Anthropic SDK. Claude for the answers; Cartesia for hearing and speaking. raea renders the lesson clips.
DialKit (MIT) for the dials. `CLAUDE.md` describes the parts and how to add one.
