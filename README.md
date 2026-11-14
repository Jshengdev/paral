# paral

A study helper that sits on a student's own screen. Hold a key and ask out loud. It marks the place on the page and
answers aloud in short sentences. When the student's own work has a wrong line, it gives one hint at a time and never
the answer.

Built at the AI@USC hackathon, November 14-15 2026.

## See it

No video yet. It will be cut from a recorded take of the real app.

## Run it

Needs macOS 14 or later, the Xcode command line tools and Node 26. Keys for Claude and Cartesia go in
`~/.config/paral/keys.env`; `keys.env.example` lists the names. No key lives in this folder.

```
npm install
./check     # builds the Mac side and runs every row; needs no key, microphone or screen
./run       # lists the two grants macOS will ask for, then starts paral
./tune      # a page of dials for every colour, size and motion time
```

Hold the right Option key, ask, and let go. Hold Shift as well to draw around something.

## How we know it works

- `./check` runs one test file over the rows in `test/rows/`. Each row states one thing that must be true.
- `exam/` is a separate judge. It plays scripted asks through the real services, films what paral draws, and reads
  the film and the record against a list of what paral must do.
- Not yet proven: the real windows on a person's screen. Everything above runs without a window.

## Built with

Swift (AppKit, ScreenCaptureKit, Vision, AVFoundation) for the Mac side. TypeScript on Node for the mind, with zod
and the Anthropic SDK. Claude for the answers; Cartesia for hearing and speaking. raea renders the lesson clips.
DialKit (MIT) for the dials. `CLAUDE.md` describes the parts and how to add one.
