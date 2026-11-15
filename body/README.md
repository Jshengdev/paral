# body

Promises: the Mac side of paral. It reports what happened and draws what it is told. It holds no logic about teaching.

Three programs come from one package: `ParalBody` (everything), `paral` (the app: thin hosts around it) and
`paral-headless` (the same pieces with no window, for rows, flows and films).

## Every piece on the screen

What paral can put over a page, one row a piece. The names in the first column are the design kit's ("Lost and
Found: brand kit"); where the kit has no frame for a piece, the name is the build's and says so. The mind decides
when; the body only draws. Nothing here takes a click except the cross and the nudge card's two buttons, and nothing
here clicks.

| piece (kit's name) | what it is for | the line that brings it | what ends it | tokens |
|---|---|---|---|---|
| Voice pill (the capsule) | paral's one voice on screen, bottom centre, its foot 28 above the Dock: one capsule whose size changes between the collapsed pill (a row of dots) at rest and the full pill, a stop control, the wave and a send control. The wave scrolls in ink with the microphone's sound while he holds the key, and in stone with the voice's while paral works and answers; still dots on a failure. At rest with paral's ink on the page, a cross that clears it, with the logo mark and the name to its left. Open, it moves along the foot off the page's read text. While paral works with no cursor on the page, the logo mark by it breathes. The two controls take no click | `key.down` (listening), `key.up` (working), `say` with `voice` or `mute` (answering), `state` failed; the wave reads the microphone's sound in the body (and a film reads the record's `mic` lines), and the voice's | the answer's end and a short linger, then it rests; the next press takes it over | `capsule.*`, `wave.*`, `light`, `mist`, `ink`, `stone`, `paper`, `glass`, `shadow`, `cursor.workGrows`, `cursor.workMs`, `motion.arriveMs`, `motion.leaveMs`, `motion.lingerMs`, `curves.arrive`, `curves.leave`, `strings.name` (beside the cross) |
| Transcript bubble (the kit's) | every word the pill has to say, in a light card 8 above it: his words as they are heard (a word still being registered in stone, settling to ink; a caret that blinks; the oldest words dropped so the newest stay in view), his words in ink while paral works, each sentence as it is said (its words stone until said) and a failure, FAILED in cardinal and the reason | the pill's own lines; `heard` for his words | rises out of the pill as it opens and goes in 0.16 s as it shuts; a line stands its least time before the next takes its place | `bubble.*`, `capsule.type`, `ink`, `stone`, `cardinal`, `motion.wordMs`, `motion.standMsAWord`, `motion.readMsLeast`, `motion.unaskedStayMs`, `strings.listening`, `strings.thinking`, `strings.failed` |
| The trail (build's name; the kit has no frame) | the steps paral took before a line it said without being asked, small in stone under the nudge card's name, joined by › as the capsule joined them, each lit once reached | `say` with `trail` | with its line | `nudge.trailType`, `nudge.trailGap`, `stone`, `dim`, `motion.trailStepMs` |
| Highlight ring, and drawn notes | "this line": a ring, underline, wavy line or bracket drawn by hand in ember, with a note beside it when the mind sends one | `mark` (kind `ring`, `underline`, `wavy`, `bracket`; `label` for the note) | `clear`, a close, or a new mark on the same line | `mark.*`, `ember`, `cardinal` (the note) |
| Highlight (the box) | "this line", where lines sit too close for a ring: a thin cardinal edge and a faint wash laid along the line by the pen | `mark` (kind `box`) | `clear`, a close, or a new mark on the same line | `mark.boxWidth`, `mark.boxPadX`, `mark.boxPadY`, `mark.boxRadius`, `mark.wash`, `mark.ringMs`, `cardinal` |
| Drawn arrow (the kit's, from its ring to its card) | "this line is what that is about": one curve in ember from the newest mark to whatever is speaking about it, and only where a way exists that keeps clear of every word on the page | no line of its own: the newest `mark` once the pen has finished it, while the capsule carries that mark's own `say`, or the nudge card carries its look's line; or, with the capsule at rest and no nudge card up, while the guide's card (`next`) names the marked line | goes with its mark (`clear`, a close, a newer mark); drawn back as the capsule closes or the nudge card goes; gone when the card's words move on, and while a `way` arrow is up | `lead.*`, `way.head`, `way.halo`, `ember`, `cursor.settleMs`, `mark.shaftMs`, `mark.headMs` |
| Highlight ring: its echo (a step's mark, waiting) | "this is the step you are on; click it when it is done": an echo of the mark's edge grows out of it and fades, again and again, as the kit's highlight does until its target is clicked | a `mark` whose `board`, with the same id, names the step (`now`) | the step moving on (the mind's `clear` and next mark, also when the next step is on the same line) or the walk ending; none with motion reduced | `mark.echoAfterMs`, `mark.echoEveryMs`, `mark.echoGrows`, `mark.echoStrength`, `curves.arrive`, `curves.travel` |
| Cursor | paral's own pointer, which is its logo mark: it shows where, never clicks. It flies to the newest mark or arrow, rides the pen, rests beside it; one ripple says "here" | the newest `mark`, `way` or `echo` on the page | goes with its mark or arrow; none with motion reduced | `cursor.*`, `cardinal`, `paper`, `motion.flightMs`, `motion.arc`, `curves.travel` |
| Cursor: tag | says whose cursor is moving: a light pill with the logo mark and the name, worn only while it comes in from nowhere; it pops out as the cursor comes | the first `mark` or `way` after the page was clean | its arrival | `strings.name`, `cursor.tagFrom`, `motion.usualMs`, `curves.pop`, `light`, `glass`, `shadow` |
| Cursor: thinking | says paral is working: a cursor that is already on the page breathes, swelling a little and coming back | `key.up`, until the answer begins | the answer's first sentence | `cursor.workGrows`, `cursor.workMs`, `curves.travel` |
| Cursor: click | answers his own click on the mark of the step he is on: paral's cursor presses and two rings spread from under its tip, come to rest and fade. Paral clicks nothing | his `click` (from the body) on a mark whose board names the step | a moment later, by itself; none with motion reduced | `cursor.pressTo`, `cursor.clickMs`, `cursor.clickStayMs`, `cursor.ripple`, `motion.pressMs`, `motion.usualMs`, `motion.leaveMs`, `cardinal` |
| The way arrow (build's name; after the kit's drawn arrow) | the thing is on this page and not in view: which way to scroll, and its name on a tag | `way` (`to`, `toward`) | `clear`, a close, a newer `way`, or a `mark` with the same id | `way.*`, `ember`, `light`, `glass`, `shadow`, `mark.width`, `mark.shaftMs`, `mark.headMs` |
| The board (build's name; in the kit's language of card and buttons) | what is still ahead, or the parts of an answer, as boxes on a light card. On a board of steps the step he is on is the ink button | `board` (`rows`; `now` for the step) | `clear`, a close, a `clip`; the same rows again keep the card in place | `board.*`, `light`, `mist`, `ink`, `glass`, `shadow`, `motion.arriveMs`, `motion.usualMs` |
| Toast | confirms something paral did: "Open in your calendar · November 22", or "Opening RSO Resources" for a page opened in his browser, beside the capsule | `open` (`label` for the date), `go` (`label` for the page) | four seconds; a `clear` does not take it | `toast.*`, `card.*`, `strings.opened`, `strings.going`, `cardinal`, `light`, `glass`, `shadow`, `motion.arriveMs`, `motion.leaveMs`, `motion.usualMs`, `curves.pop` |
| Nudge (the kit's, with its pill buttons) | a line paral says without being asked, or any line with an offer: the name and the trail (when it has one), the message, and its offer's button ("Add to calendar" when its date can be kept) and "Not now". Beside the marked line, to the right of the page's text when there is room | `say` with `trail` or `offer` (`keep` or `offer` for the buttons); spoken words fill in from stone to ink with its `voice` | with buttons: "Not now", the hold key, a close, a newer such line taking its place, or after a press of its offer the mind's answer (`open`, `go`, its next `say`, a `clear`) or `nudge.answeredMs`; without: its reading time and `motion.unaskedStayMs`. Words he answered get no card again while the app runs | `nudge.*`, `scale`, `stone`, `light`, `mist`, `ink`, `paper`, `glass`, `shadow`, `band`, `curves.arrive`, `curves.leave`, `strings.name` |
| Nudge, without its buttons (the guide's card) | says what to do next for the page he is on, and which step it is, so a first run needs no one beside him. The closing line comes when every step is done | `next` (`text`, `n`, `of`; `done` for the closing line) | a `next` with no words; the closing line goes by itself after the toast's stay; either way it goes in less time than it came; a `clear` does not take it. Not drawn at all when "Show the guide" is unticked in the menu | `guide.*`, `card.*`, `strings.step`, `strings.name`, `toast.stayMs`, `motion.arriveMs`, `motion.leaveMs`, `motion.standMsAWord`, `motion.readMsLeast`, `light`, `mist`, `stone`, `glass`, `shadow`, `cardinal` |
| The lesson clip (build's name; no frame in the kit) | a rendered clip on an example that is not his, in the board's place, on a dark card | `clip` | `clear`, a close, a `board` | `board.pad`, `board.radius`, `board.maxWidth`, `ink` |
| His own trail and his loop (build's names; they are his, not paral's) | the path of his pointer while he draws with the draw key held, and that loop drawn back by hand once his words are final | `trail` (from the body), `echo` | the trail fades as he lets go; the echo goes at his next press or when paral marks inside it | `accent` (the trail; the kit's ember, as the echo is), `ember` (the echo), `mark.width`, `motion.trailFadeMs` |

Every light surface (the capsule, the board, the tags, the toast, the guide's card) is drawn by one function,
`Painter.surface`: a solid light fill (`glass` 1, so no word of the page shows through), a soft shadow, a hairline
edge in `mist`, and outside the edge a band of the surface's own colour (`band`), so the page's letters stop short
of it. A ring round a whole line of text is the kit's loop: flat above and below the words with round ends, a little
open where it began; between close lines it is flattened on each side to pass through the middle of the gap to the
nearest line, so it strikes through no word. The guide's card sits in a corner (`Layout.corner`): the top right first, below the
Mac's menu bar, then down that side, then the top left, on none of the page's read text, the marks, the board, the
arrow, the toast or the capsule. "Show the guide" is one item at the top of the menu bar's menu (`GuideSwitch.swift`),
ticked when the app starts; nothing crosses the seam for it.

Not built from the kit: a click on the pill's stop and send controls (they are drawn and take none: paral is held
and let go), and the wordmark. The kit's
cursor clicks through the site; paral clicks nothing, and the kit's picture of a click is used to answer a click of
his own (below).

## The nudge card

A line said without being asked (a `say` with a `trail`) comes up on the design kit's nudge card, and the capsule
stays at rest for it. The scene decides which line the card shows and when (`SceneNudge.swift`); the painter decides
where and draws it (`PainterNudge.swift`, `Layout.nudge`), as for the guide's card and the toast.

- **What is on it.** The light surface, 420 wide, padding 24, corner 24, rows 16 apart. The avatar is whatever the
  guide's card draws for its small picture (the logo mark, `logo`), at 24, then "Lost and Found" in stone at 15. The trail of
  steps sits under the name, small and in stone, each step lit once reached. Then the message at 22, wrapped: a line
  shown and not spoken is in ink at once; a line with a voice comes up when its sound begins and each word goes from
  stone to ink as it is said, as an answer's words do in the capsule. With `keep`, "Add to calendar" (ink, white
  words) and "Not now" (mist, ink words), Medium 18 with the kit's tracking, 8 apart. Every number is in `nudge`, and its kit sizes go with `scale`.
- **Where.** Level with the line the look marked and `nudge.beside` past the right end of the page's text at that
  height; where that is taken (by the board, or by the text itself) the free place nearest that home. Free is inside
  the display below the menu bar and `nudge.clear` from every read line, every mark's whole ink, the cursor's resting
  place, the board, the clip, the way arrow, the toast, the guide's card and the open capsule, with room for its rise.
  With the way to the line and no mark, its home is the right side above the capsule. Only when no place is free at
  full size is it shrunk, a twentieth at a time down to 0.8 (`nudge.least`, the smallest that still reads). Where none
  is free even then, no card is drawn: the line is shown in the capsule as it was before the card, with its trail and
  no buttons, the arrow leads there, and the film's record names it (`nudge-in-capsule`). A card never lies on the
  page's words. On the recorded club page at a scale of 1, with the board up, it is drawn at
  0.95 to the left of the board. It keeps its place while that stays free, and a card that is going does not move.
- **How it moves.** It comes up as the guide's card does, with the same two helpers (`Scene.coming`,
  `Painter.card` and `Painter.line`, tokens `card`): on `arrive` in 420 ms from 0.96 of its size, anchored at its
  top, and 10 points low; its three lines follow 60, 110 and 160 ms after it began, each rising 6. It goes on `leave`
  in `nudge.leaveMs` (160), to 0.98 of its size. The kit's blur on arrival is not drawn. With motion reduced it is
  there or not. The drawn arrow lands on the card's near end about a third of the way down (`nudge.landing`), as the
  kit's newer pictures have it.
- **Its offer.** A `say` line may carry `offer` (`label`, `send`): one thing it offers to do. Its card's primary
  button says `label`, and a press sends `send` as a tapped line, exactly as a cue card tapped in the menu does.
  `keep: true` is the offer "Add to calendar" / `Nudge.asks` ("add it to my calendar"); a line with both shows its
  `offer`. A line with an offer goes on the card though it carries no trail: the card then has no trail row, and the
  capsule stays at rest for it. The first line of an ask decides where the ask is shown.
- **When it goes.** With buttons it stays until a button is pressed, the hold key is pressed, the cross closes the
  conversation, or a newer such line takes its place (the same words sent again as the page scrolls are the same card,
  which does not come up again). After a press of its offer the card stays up, the pressed button drawn held and
  nothing more offered, until the mind answers: an `open`, a `go`, its next `say` or a `clear` (or the end of that
  ask), and `nudge.answeredMs` (3 s) after the press at the latest, so it never hangs. "Not now" sends it away at once. The words of a card he answered either
  way, and the words of the line whose date was opened however it was asked for, get no card again while the app
  runs; a press of the hold key keeps nothing. Without buttons it stays its reading time and `motion.unaskedStayMs`,
  as the capsule kept such a line before. "Not now" crosses no seam (`Seen.notNow`): a film of a real run cannot show
  it, and rows play it through `PARAL_NOT_NOW` on `placed`.
- **Clicks.** The overlay is a panel that never makes the app active, so the page keeps the keyboard and a press on
  a button is taken at the first click. What takes a click is what the last picture drew as taking one: the cross,
  and each button while the card offers it, a little wider than drawn. A button is drawn at 0.96 while held and asks
  when the mouse is let go on it; the cross still clears at the press. The left button's own `click` line goes to the
  mind for every click, these too. None of this has run on a Mac.
- **Over it.** The cursor and its name tag are drawn above everything, and may pass over the card while they fly in
  and ride the pen; at rest the cursor is clear of it.

## A page of USC's, opened in his browser

A `go` line (`url`, `label`) is a page of USC's he asked to be taken to. The app opens it in his default browser
(`Keep.go`), and only an https address whose host is usc.edu or ends in .usc.edu (`Keep.usc`, a pure check with its
row): http, another host, usc.edu.evil.com, a file path, nothing else. A refused address is said in the capsule as a
failure. The scene shows the toast for it, "Opening" and the page's name (`strings.going`), and a card whose offer asked
for it goes. A film and the scripted stand-in open nothing. Never run on a Mac.

## The guide's card on his screen and out of a recording

The guide's card is for him, not for whoever watches a recording of his screen. So the app paints it in a window
of its own (`GuideWindow.swift`): a panel over the whole display, at the overlay's level, on every space, never
making the app active, letting every click through, and marked not to be shared (`sharingType = .none`). The
overlay paints the same picture with the card left out (`Painter.leavesOutGuide`): the card is still placed, so
everything else keeps off it, and the arrow that leads to the card goes into the card's window with it rather than
point at nothing. "Show the guide" in the menu hides and shows it as before. A film paints one picture, card and all.

Whether this macOS leaves such a window out of a `screencapture` recording has not been seen: newer ways of capturing
the screen are said to ignore the setting. To check, with the app running and the guide's card on screen:

```
screencapture -v -V 5 ~/Desktop/guide-check.mov
```

It records five seconds of the screen (the Terminal may first need the screen-recording grant). Open the movie: the
card and its "Step n of 8" should be missing from it while the capsule, the marks and the board are in it. If the
card is in the movie, this macOS records the window anyway and the setting does nothing here.

## Deciding what is on screen

| file | job |
|---|---|
| `Seen.swift`, `Lines.swift` | the seam on this side: every line read and written, checked at the edge |
| `Scene.swift`, `SceneTimes.swift`, `ScenePicture.swift` | events in, a `Picture` for any moment out. No clock, no drawing |
| `ScenePill.swift` | the pill's wave (how loud it is at each sample, from the microphone's sound or the voice's) and the logo mark that breathes by it |
| `Meter.swift` | how loud a chunk of sound is, 0 to 1, for the wave |
| `ScreenInk.swift` | the page's own ink in the band at the foot, for the scene only, so the pill keeps off a drawing as it keeps off words |
| `SceneWay.swift` | the arrow that says which way to scroll: how far the pen has inked it, and its nod |
| `ScenePointer.swift` | paral's own cursor: its flight to a mark, its ride on the pen, its rest beside the mark and the ripple there |
| `Picture.swift` | what is on screen at one moment, as plain values |
| `Layout.swift`, `LayoutPill.swift` | where the pill and its bubble sit, off the page's read text, the largest empty place for a board, the place at an edge for the way arrow, and where the cursor rests beside a mark |
| `Motion.swift` | how things move: the four curves, even speed for ink, and the cursor's arc |
| `Pen.swift` | the path the pen takes for each kind of mark |
| `PenWay.swift` | the strokes the pen makes for the two drawn arrows: a shaft, then a head |
| `PenEcho.swift` | the echo of a mark's edge: how far it may grow on each side without coming onto the page's other words |
| `SceneEcho.swift` | the mark of a walk's step, which sends out echoes of its edge while it waits for his click |
| `SceneLead.swift` | the arrow from a mark to what speaks about it: which mark has one, what it leads to, how far it is inked |
| `SceneNudge.swift` | the nudge card: which line it shows, what he did with it, when it comes and goes, and which words get no card again |
| `LayoutNudge.swift` | where the nudge card goes: beside its line, right of the text, else the nearest free place, shrunk only when none is free |
| `SceneCard.swift` | how a card stands at one moment: the card coming up, then each of its lines in turn |
| `SceneClick.swift` | his click on the mark that waits for it: the cursor's press and the rings that answer it |

## Drawing it

| file | job |
|---|---|
| `Painter.swift` and `Painter*.swift` | draw a picture into any drawing context, with the tokens |
| `PainterCapsule.swift`, `PainterBubble.swift` | the voice pill (its dots, its controls and its wave, or the cross) and the bubble above it |
| `PainterLead.swift` | finds the way the arrow from a mark takes to what speaks about it, and inks it |
| `PainterCard.swift` | a card as it comes up and goes, and one line of it rising into place: for the guide's card and any other card |
| `PainterLogo.swift` | the logo mark, drawn from the kit's outline: the cursor, and paral's face in the tag, on the guide's card and at rest |
| `PainterNudge.swift` | draws the nudge card and gives back where its buttons take a click |
| `Tokens.swift`, `tokens.json` | the look in one file: colour, type, sizes, motion times |

## Hosts (real windows only)

| file | job |
|---|---|
| `Key.swift` | the hold key and the draw key, read by asking the system for the keys' state. No event tap |
| `Mic.swift` | the microphone as 16 kHz chunks, only while the key is held |
| `Speaker.swift` | plays the voice as it arrives; drops what is waiting at the next key press |
| `Screen.swift` | one picture of a display without paral's own window, the lines read from it, his path drawn on it |
| `Overlay.swift` | one see-through panel above everything that lets every click through, except where the last picture drew the cross or a nudge button; it never makes the app active |
| `GuideWindow.swift` | the guide's card, and the arrow that leads to it, in a panel of their own over the display that lets every click through and is marked not to be shared, so a recording of the screen leaves them out |
| `Press.swift` (in the app) | what a click the overlay took does: the cross closes, "Add to calendar" asks as a tapped cue card does, "Not now" puts the card away |
| `Wire.swift` | the socket to the mind; reconnects when the mind restarts |
| `Watch.swift` | looks at the display with no key pressed and reports a look when what it read, or where its first line stands, has changed and stood still. It reads the text only when the picture has changed. It has run on the owner's Mac since 2026-11-14 19:53; its sense of a scroll that keeps the same lines in view has not |
| `Release.swift` | the end of a hold: the microphone's grace after the key is let go, and a new press that ends the hold before it first. Used by the app and by the scripted flow |

## With no window

| file | job |
|---|---|
| `Flow.swift` | plays a scripted run against the real mind: key, sound, pointer path, a picture of a page |
| `Film.swift` | replays a recorded run into frames, a voice track and a list of where each thing was drawn |
| `FilmPages.swift` | the pages of a recorded run and when each came up, so the frames are drawn over the page that was on the screen |
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

A step with `"look": true` in place of a `wav` is a look with no key pressed: what the app's watcher sends by itself. `"page": PATH` on any step puts another page on the screen from that step on (he clicked, scrolled or opened a section), and `"waitMs": N` is how long a look step waits before the next one (6000 if left out). A flow with `"live": true` is walked a step at a time by whoever writes the file: when the steps so far are played it waits for another to be added, and `"end": true` closes it. Any other flow ends with its last step.

## The way arrow

A `way` line is drawn as a tag with the name of what it leads to (`toward`) and a hand-drawn arrow that leaves the tag
and turns toward the edge he must scroll to. The tag is up the moment the line arrives; the cursor flies to it and
the pen then inks the arrow (with motion reduced it is whole at once). After that it nods toward the edge every few
seconds and is otherwise still, so the overlay is not redrawn all the time he reads. Its place has room beside the
arrow for the cursor to rest. It sits at that
edge: at the bottom beside the open capsule, at the top in the middle, or the nearest place to that which is on none
of the page's read text, the capsule, the board or the clip (`Layout.way`). Where the edge is full of text it moves
in from the edge rather than cover any, up to a third of the display. There is one arrow at a time: a newer `way`
takes the place of the one before, and `clear` or a close wipes it. While it is up the resting circle carries the
cross. Its looks are the `way` group and `ember` in `tokens.json`. Its shape is after the drawn arrow of the design
kit ("Lost and Found: brand kit", page 08), drawn here in code; no picture is loaded.

## The arrow from a mark to what speaks about it

The design kit's page 08 draws one curve from the ring round a line to the card that speaks about it. Here the scene
says which mark has one and what it leads to (`SceneLead.swift`) and the painter finds its way (`PainterLead.swift`);
nothing crosses the seam for it.

- **One at a time.** Only the newest of paral's marks on the page has an arrow, never his own loop, and none is drawn
  while the arrow that says which way to scroll is up.
- **What speaks.** The capsule, whenever it carries that mark's words: the arrow comes when the mark's own sentence
  comes up in the capsule, stays while the capsule holds that answer's words, and is drawn back as the capsule
  closes. The guide's card says what he does next, which is seldom about the marked line ("Say it again: show me"),
  so it is led to only once the capsule is at rest and only when its words name the very line that is marked: the
  whole of a read line the mark is on is among the card's words ("Open Deadlines", with the mark on "Deadlines"). The
  body can tell no more than that from the lines it is sent; in every other case there is no arrow.
- **When.** It is inked once the pen has finished the mark and the cursor has stepped aside (`cursor.settleMs`), in
  two strokes at even speed, the shaft and then the head (`mark.shaftMs`, `mark.headMs`), and it is whole at once
  with motion reduced.
- **Its ink never covers the page's words.** A way is refused when its ink or its paper edge comes within
  `lead.clear` (4 points) of any read line, the line it leaves among them. It is refused too when it lies on the
  mark, the resting cursor, the board, the clip, the way arrow, the toast or the other speaker, or off the display,
  and when it is longer than `lead.longest` (1000 points: on the recorded club page the ways down the right margin
  to the capsule run 590 to 920). Where no way is left, no arrow is drawn: a missing arrow is fine, an arrow over
  words is not.
- **Its way.** It begins straight out from the mark's edge, on the far side of the cursor where the cursor rests
  there, and stops `lead.gap` (8, the kit's arrow stops about that short of its card) from what it leads to. From
  there it may set off straight out, as the kit's bow does, or turned by up to a quarter turn, which is what lets it
  run down a margin too narrow for a bow; of the ways that are clear, the shortest and the nearest the kit's plain
  bow wins. The way is found once and kept while nothing it depends on moves.
- **Its shape.** One bow after the kit's drawn arrow, whose curve was measured: pulled out 0.37 of the straight way
  the way it leaves, and arriving turned as far to the other side, pulled back 0.32; then the head, with the way
  arrow's barbs (`way.head`) and paper edge (`way.halo`). Its ink is `lead.width` across (2.5): the kit draws its
  arrow at the ring's 3.5, a third of a card long; here it can run the height of the page, and at the ring's weight
  a stroke that long takes the eye from the box it starts at.

## How things move

Everything that moves rides one of four curves, and ink runs at even speed. The curves are his, from his earlier
motion work, taken as numbers and nothing else (`curves` in `tokens.json`, each written as a stylesheet writes
`cubic-bezier`). The design kit's handoff says its own motion was written for the handoff and is not in the kit, so
the handoff decides what there is, how big and in what order, and these decide how it moves. `Motion.swift` holds the
curve; the `body.curves` row holds each one's values.

| curve | its numbers | what rides it |
|---|---|---|
| `arrive` | 0.16, 1, 0.3, 1 | what comes up: the capsule at a press, the board, the clip, the toast, the guide's card, the nudge card and its rows; the way back of a nod; the spread of the cursor's ripple and of a mark's echo. It leaves at once, half the way in the first tenth of the time, and lands very softly; it goes past nothing |
| `travel` | 0.65, 0, 0.35, 1 | what goes from one place to another: the cursor's flight and its step aside, a card growing from empty to its rows, the dip of a nod, the cursor's breath while paral works, an echo's fading. Slow at both ends |
| `leave` | 0.55, 0, 1, 0.45 | what goes: the capsule shutting, the toast and the guide's closing line going, the leading arrow drawn back with the capsule, his own trail and the ripple fading. Slow to start, then gone |
| `pop` | 0.34, 1.56, 0.64, 1 | a small thing popping out: the cursor's name tag, from `cursor.tagFrom` of its size (0.6, the handoff's), and the toast's badge. It goes a tenth past its place and comes back. Never a card, never words |

- **Times** (`motion`): `arriveMs` 420; `leaveMs` 180, so what goes is gone in less than half the time it took to
  come; `usualMs` 280, for the usual small change (a card growing to its rows, the tag's pop); `flightMs` 420 for the
  cursor's flight. His scale also has 90 for a press, 220 for a swap, 620 for something slow and 900 for a whole
  scene; nothing drawn here uses those yet, so they are not tokens yet. `tempo` still speeds or slows all of it.
- **Ink** (`mark`): a pen neither hurries nor slows, and it is quick. `ringMs` 450 for a ring or a box (a ring still
  runs `overshoot` past where it began and grows a twentieth wider on the way round); `lineMs` 300 for an underline
  or a wavy line; `bracketMs` 300, since a bracket is no longer than an underline (chosen); and a drawn arrow is two
  strokes, `shaftMs` 400 and then `headMs` 140, whatever its length.
- **Nothing springs.** The old curves went past their place by `motion.bounce` (0.06 of the way), which is further
  than his motion work goes anywhere but a small pop; that token and the spring are gone.
- **Why the capsule's opening is an arrival** and not a change of size on `travel`: a press must be answered at
  once. On `arrive` the capsule is half open 42 ms after the press, which is when its controls begin to show, and
  nine tenths open at about 138 ms; the bubble rises on the same curve from the same moment, so its words are half
  there at 42 ms. On `travel` it would have moved a hundredth of the way in those 42 ms and its words would wait until
  about 300. (With the old spring over 260 ms the words came at about 88.) These are read off the
  curves, not measured on a screen.

## The kit's sizes, and one scale over them

The pieces the design kit draws are drawn at the kit's own sizes, which its handoff gives as exact from the design
file. They were about 0.7 of that before.

| piece | the kit's sizes | tokens |
|---|---|---|
| Cursor | the mark in a frame of 36 with its tip at (3.6, 3.6); the ripple's rings 42 and 70 across, a line of 2 | `cursor.size`, `cursor.ripple` (35, the outer ring's reach); the rest are shares of the frame in `PainterCursor.swift` and `Layout.cursorTip` |
| Cursor: tag | type 15 medium, the mark at 18, room 8 on the left, 14 on the right, 7 above and below, a gap of 8, at (26, 30) of the cursor's frame | shares of the cursor's frame in `PainterCursor.swift` |
| The guide's card | 420 wide, room 24, corner 24, 16 between its lines, words 22 regular, the name line 15 medium in stone, the mark at 24 and 10 from the name | `guide.width`, `pad`, `radius`, `gap`, `type`, `small`, `avatar`, `nameGap`, `stone` |
| Toast | type 18 medium, badge 30, room 10 on the left, 20 on the right, 10 above and below, a gap of 12 | `toast.type`, `pad`, `gap` (the badge and the right-hand room are shares in `PainterToast.swift`) |
| Highlight (the box) | room 14 across and 10 up and down, corner 12, edge 2, wash 8 percent | `mark.boxPadX`, `boxPadY`, `boxRadius`, `boxWidth`, `wash` |
| Drawn ink | 3.5 across | `mark.width` |

`scale` is one dial over all of these (and `lead.width`, the leading arrow's ink): 1 is the kit's size, and
`Tokens.load` gives the look with it already applied, so nothing else knows of it. The kit's handoff asks for one
such scale and not for changed sizes. The voice pill, its wave and its bubble are under it too (`capsule`, `wave`,
`bubble`), but for the pill's height above the floor and the resting cross; the board and the way arrow are the
build's own and are not. The step's number on the guide's card, which the kit has no frame for, is written as the name line is.

What the larger sizes cost on the recorded club page: nothing is on the page's words. The card is 420 wide where
it was 300 and still sits in the top right clear of the text, which ends at about 1040 of 1728 points there; on a
narrower page it goes down the side or to the left as before (`Layout.corner`). The box gets the kit's 10 above
and below only where lines stand that far apart; on the page's close lines it is cut to the middle of the gap, as
it was. The ripple's rings are the kit's 70 across where they were 54, and for the 0.9 s they last they cross the
end of the line the cursor rests beside. These are from stills of the first recorded walk, not a screen.

## A card comes up, and its lines after it

A card comes up as the design kit's cards do (`SceneCard.swift`, `PainterCard.swift`; the kit's order and sizes,
on his curves). The card itself comes first, on `arrive` in `motion.arriveMs`, from `card.from` of its size (0.96)
and `card.drop` below its place (10), growing from the middle of its top edge. Its lines follow one after
another: the first sets off `card.firstMs` (60) after the card and each next one `card.nextMs` (50) after the one
before, and each rises `card.rise` (6) into place as it comes, on `arrive`. It goes on `leave` in `motion.leaveMs`,
which is less than half the time it took to come, shrinking a little as it goes (to `card.goneTo`, 0.98). With
motion reduced it is whole at once and gone at once.

The guide's card is drawn this way: the card, then its name line (the logo mark, the name and the step's number),
then its words. A `next` with no words now takes the card away in that leaving time and not at once, as the
closing line's card already went. A later line still changes the words in place, at once: text steps, it does not
slide. The film's record names each line where it is just then (`line`, `guide/0` and `guide/1`).

Another card is drawn the same way with three calls: `Scene.coming(since:lines:gone:at:)` for how it stands,
`Painter.card(_:radius:_:_:contents:)` for its surface, and `Painter.line(_:of:on:at:_:_:)` for each of its lines
inside `contents`. Its face is `Painter.logo(middle:across:_:)` (or `logo(in:_:)`), the mark the guide's card wears.

## The capsule clear of the Dock

The capsule's foot is `capsule.bottom` (28, the kit's) above the foot of the display, and above the Dock when the
Dock takes part of that foot. The app tells the scene how much (`Scene.bottomInset`, 0 with the Dock hidden or at
the side, and in a film); the scene puts it in the picture, and the painter lays out everything that sits at the
bottom above it: the capsule, the way arrow beside it, the toast, and the ways of the leading arrow; the board's
place is found above it too. The window's test for a click on the cross (`Overlay.swift`) must lay the capsule out
with the same height less the inset, or the cross is drawn above where its click is taken.

## The voice pill and its bubble, after the kit's

The capsule is the design kit's voice pill (its page 06 and the designer's handoff, 6.5), drawn here in code. It is
one light capsule whose size changes between two: at rest the collapsed pill, 78 by 19 with eight dots in ink at 35
percent, and open the full pill, 234 by 50: a stop control (a mist circle with an ink square), the wave (124 by 32) and
a send control (mist with a stone arrow; ink with a white arrow while he is heard saying something), 36 across, 6 in
from the edge and 12 apart. The two share their foot, `capsule.bottom` (28) above the floor, which is the display's
foot less the Dock (`Scene.bottomInset`, 0 in a film). It grows on `arrive` in `motion.arriveMs` at a press and shuts
on `leave` in `motion.leaveMs`; the kit's spring is the build's `arrive`, which goes past nothing. The controls take
no click: paral is held and let go. While paral's ink is on the page it rests as a cross that clears the ink, and since
a cross alone over a line of the page reads as a stray button, it wears the resting logo mark and `strings.name` to its
left, small (`capsule.tagType`), so it is plain whose cross it is. The cross keeps its place, centred where the full
pill's middle is: a click is taken on the cross's own circle and nowhere else, so the name takes no click. The room for
the name opens as the capsule shuts, and the name is written from the cross leftward, so it does not slide.

- **The wave.** One sample every `wave.sampleMs` (110), `wave.pitch` (7) apart, scrolling from right to left, each a
  dot when it is quiet (a level under 0.22, drawn at 55 percent), a 3 by 10 bar under 0.55 and a 3 by 18 bar above,
  fading over a tenth of its width at each end: the kit's three marks. In ink while he holds the key, in stone while
  paral works and answers; on a failure it is the kit's fourteen still dots. Where every sample in view is quiet it
  stands still, since a row of even dots looks the same moved. The level is worked out in the body (`Meter.swift`):
  the sound's root mean square in decibels, held between -50 and 0 and laid onto 0 to 1, as the handoff feeds its
  meter. While he holds the key it is the microphone's: the app tells the scene each chunk it sends to the mind, and a
  film reads the same chunks from the record's `mic` lines, so the film shows the wave the window showed. Nothing new
  crosses the seam. While paral speaks it is the voice's, at the moment of the voice being played. With motion reduced
  the samples step and do not glide.
- **The bubble** (`PainterBubble.swift`), the kit's transcript bubble, carries every word the capsule used to: centred
  8 above the pill, 16 in across and 10 up and down, corner 14, at most 520 wide, in DM Sans Regular 16. Listening,
  his words on one line, a word still being registered (heard less than `motion.wordMs` ago) in stone and in ink once
  it has settled, a caret 1.5 by 18 after them that blinks every half second, and the oldest words dropped behind an
  ellipsis so the newest stay in view; before any word, `strings.listening` in stone. Thinking, his words in ink and no
  caret (`strings.thinking` in stone when he said nothing). Answering, the sentence being said, up to two lines round
  its newest said word, stone until said and ink from then on, exactly as the capsule filled its words; an aside the
  same. A line said without being asked is the nudge card's, not the bubble's (below). A failure is FAILED in
  cardinal and bold and the reason after it, as before. It rises out of the pill as the pill opens (`bubble.rise`, on
  `arrive`) and goes in `bubble.leaveMs` (160, the handoff's exit) as the pill shuts, holding its last words while it goes.
- **Off the page's words.** Open, the pill moves along the foot, a step of 24 points at a time, to the nearest place
  where neither it nor the room its bubble may take (520 wide, two lines tall) lies on any of the page's read lines
  (`Layout.pillMiddle`); where no place is clear, the one that covers least. At rest the collapsed pill, and the
  cross with its logo and name, slide the same way to the nearest place that lies on no read line, and stay at the
  middle where none is clear (`Layout.restMiddle`); the window takes a click on the cross where it was drawn.
  The page's own ink in the band at the foot counts as well as its read lines, so a drawing is kept off too:
  `Screen.inked` (`ScreenInk.swift`) finds it on every picture of the screen, cells of about 6 points that differ from
  the page's own grey, and the app, the stand-in and the film give it to the scene only, as lines with no words. The
  mind is sent the read lines as before.
- **The foot is the pill's alone.** The band across the whole foot, from the top of the room the bubble may take
  above the full pill down to the Dock (`Layout.foot`), holds the pill and its bubble and nothing else of paral's,
  after the designer's pictures: the way arrow pointing down and the toast sit just above it, and the board, the
  guide's card, the nudge card and an arrow to a card keep out of it. An arrow to the pill ends at it. A mark on a
  line of the page that lies in the band is still drawn there.
- **His question stays.** Once paral draws on the page for his ask (a mark or a board of that ask), his question
  stays in the bubble as the reason for what is drawn, and the pill keeps its look, until the answer's own words
  take the bubble: a line said while he waits shows only until then.
- **That it works.** While paral thinks, a cursor on the page breathes; with none on the page, the logo mark by the
  pill's left end breathes the same way (`capsule.face`, `cursor.workGrows`, `cursor.workMs`).
- **What leads to it.** The arrow from a mark leads to the full pill and the bubble as they are, so its way changes
  only when the bubble's words do.

The board is a card of the same light surface: a box is the kit's quiet button (`mist`, written in ink) and the step
he is on its main button (ink, written in white). The way arrow's tag, the cursor's tag and the toast are the same
surface. `glass` is how solid it is and `shadow` how far its shadow spreads. `light` is the kit's white (#FFFFFF since
its update; it was #FBFBFB). The kit fills at 0.85 over a blur of the page; the overlay cannot blur what is under it,
and at 0.85 with no blur the page's words would show through the card's, so `glass` is 1. Only the lesson clip keeps
its dark card.

## A line stands a least time

Where one line takes the place of another, in the capsule or on the guide's card, the one before has stood a least
time first, and the newer waits its turn; none is passed over. The time is `motion.standMsAWord` for each word (200:
two seconds for a line of ten words, which is the lead's measure for a line to be taken in, not a reading time) and
never less than `motion.readMsLeast` (1200, the least any line is given). It is decided in the scene as lines
arrive, so the windows and the films agree.

- **The guide's card.** A `next` line is shown when it comes, or when the line before it has stood. A `next` with no
  words takes the card away the same way, once its line has stood; a line that comes after an empty card comes at
  once. The card's closing line counts its stay from when it is shown.
- **A line said without being asked.** It comes up on the nudge card once the line the capsule holds has stood its
  time, and after every such line still waiting for its own turn. Its reading time and its stay run from then. Its
  mark is not held: the pen draws it when it arrives.
- **An answer said aloud.** Each sentence's words come up with its voice, and not before the sentence before it has
  stood. A sentence takes longer to say than to stand unless it is a word or two ("One moment." is half a second
  of voice and stands 1.2), so the words run behind the voice only after such a one, and by no more than its
  standing time less its speaking time; the words already said are bright the moment they come up. The voice, the
  marks and the board keep the voice's own times.

## Type and ink, after the design kit

Everything is written in the typeface the `font` token names (the kit's DM Sans), at the optical size in
`fontOptical` where the family has one (the kit's 14). `Faces.swift` makes each size and weight once. When the Mac
does not have the family the system's font is used and that is said once on the error stream; nothing is downloaded.
An empty `font` asks for the system's font. `ink` is the kit's #141414. `paper` stays white: in the kit, paper
#F4F4F4 is for page backgrounds, and what it writes on ink is white.

## Marks and the cursor, after the design kit

The seam's mark kinds are unchanged; the kit's look comes through tokens. A ring, an underline, a wavy line and a
bracket are drawn by hand in `ember`. A box is the kit's neat highlight: a thinner edge (`mark.boxWidth`) in
`cardinal` and a faint wash of cardinal inside it (`mark.wash`, the kit's 8 percent), laid across the line from its
start as the edge is drawn, the way a highlighter is pulled along. The wash tints the words and does not hide them.
The box leaves the kit's room round its line, `mark.boxPadX` across and `mark.boxPadY` up and down, with the kit's
corner (`mark.boxRadius`), where the page has that room; between close lines its top and bottom stop in the middle
of the gap to the next line, and its ends stop half way to a neighbour on the same line, so neither its edge nor
its wash is on any other words (`Pen.hug`).
No mark's ink leaves the display: where the thing it marks runs to an edge of the display or past it (a line as wide
as the page), the pen's path runs along that edge, `mark.pad` in, so a loop is still seen to close. His own loop
coming back is kept inside the same way.

The pointer is the kit's cursor, which since the kit's update is the logo mark and no longer an arrow: a rounded
triangle that points up and to the left, filled in `cardinal`, with a white edge so it reads on any page and a thin
black ring so it reads on white. It is drawn in code from the kit's outline (`PainterLogo.swift`): the same outline
three times, a black stroke, a white stroke on top of it and then the fill; no picture is loaded. It sits in a
square frame of `cursor.size` (36, the kit's) with its tip a tenth of the frame in from the frame's top-left corner
(`Layout.cursorTip`, the kit's (3.6, 3.6)); the mark's own outline reaches that point to within a third of a point,
worked out from the outline and not measured on a picture. The same mark is paral's face wherever it names itself:
in the cursor's tag (18 across), on the guide's card (`guide.avatar`), and as the capsule at rest (`capsule.rest`,
where it reads well at 18, so the mark is used there too and not a plain dot). No orb is drawn anywhere. It flies to where the newest mark
starts (from the capsule the first time, from wherever it was after that), rides the pen while the mark is drawn,
then steps aside to rest just beside the mark on none of the page's read text (`Layout.beside`: to the right of the
mark first), and a ripple spreads from it once. It points and never clicks: it is ink in the overlay, which lets
every click through. It comes for a mark with no key pressed too (a look's mark), stays for as long as its mark is
on the page, and goes with it on a clear or a close. With motion reduced there is no cursor. It is never drawn off
the display: where a mark or an arrow runs to an edge, the cursor is moved the least that keeps all of it on the
display, so its tip leaves the pen for the last few points of such a stroke; its name tag is kept on the same way,
and then sits level with the cursor and not under it. While it comes in from
nowhere (its flight and its ride on the pen) it wears the kit's name tag, a light pill with the logo mark and
`strings.name`, so he can tell whose cursor is moving; at rest it wears nothing. While the capsule says paral is
working, a cursor that is on the page breathes, as the kit's does: it swells about its middle by `cursor.workGrows`
of its size (0.12, the kit's) and comes back, `cursor.workMs` each way (600, the kit's) on `travel`, counted from
the moment he let the key go; it is its own size the moment the answer begins (the kit springs it back; that is
not built). The designer's own example rests the mark on top of what it points at, since the mark is blunter than
the arrow was; here the rule stands that it rests beside the thing with its tip toward it, on none of the page's
words. His own trail while he draws and his loop coming back are both the kit's hand ink, ember (`accent` and
`ember`; the trail was an orange of the build's own, which the kit does not have). The picture of the screen sent
with a circle draws his path in `accent` too, and the lesson clips take their accent from it. His loop comes back
drawn by hand whatever its shape, with no wash: the wash is the kit's highlight for one line, and he may have
circled a table.

## A walk through steps ("show me")

The body draws a walk and decides nothing of it; the steps and when they move on come from the mind. A `board` line
with `now` is a board of steps: the row with that number is lit (its box filled with the card's chalk and written in
the card's ink) and the others stay as they are. The same rows coming again within a tenth of a second of a `clear`
are the same card: it does not fade in a second time, and it stays where it is unless the page has moved and put
text there. With the step's line in view the mind sends a `mark`, and the cursor goes to it. With it out of view the
mind sends a `way`, and the cursor goes to the arrow: it flies to the tag, the pen inks the arrow once it is there,
and it rests beside the arrow. That is how it leads from one place to the next. From an arrow it sets off again from
the capsule, since the scene does not know where the painter put the arrow.

A click on the step's box moves the walk on, so the mark of the step he is on waits for him and says so as the
design kit's highlight does (`SceneEcho.swift`): an echo of its edge, `mark.echoStrength` strong (0.35, the kit's),
grows out of it to `mark.echoGrows` larger (0.18, the kit's) and fades, and another follows every `mark.echoEveryMs`
(1100, the kit's) from `mark.echoAfterMs` (500, the kit's) after the pen has finished the mark. The mind sends
nothing for it: a walk's mark is a mark whose board names the step, and a look's mark never has an echo. The echo
sets off at once and lands softly (`arrive`) and fades slow at both ends (`travel`); the kit's own curve for it was
written for its handoff. It is the mark's whole edge pushed out from the mark's middle (`PenEcho.swift`), so on a
long line it reaches further at the ends than above and below, as a larger copy of a long box does; and on any
side where that would bring it onto the page's other words or off the display it is pushed only as far as there
is room, so between close lines it grows sideways and hardly up or down. It takes the place of the breath that
was here before (a glow and a deeper wash). On every step the mind clears and sends the mark again, also when the
next step is on the same line (on the club page steps 1 and 2 are), and the body draws it again with the pen and
starts its echo over from that ink: the redraw is what tells him the click took. While a step waits the picture
changes about 45 times a second, where the breath changed it for 1.4 s in every 3.6; what that costs on his Mac is
not measured. The echo's first half second is also the cursor's ripple's last: `mark.echoAfterMs` is the dial for
that. The film's record names each echo (`pulse`, with the mark's id; `echo` there is his own loop coming back).

## His click is answered

The design kit's cursor has a picture for a click: the cursor pressed, and two rings round its tip. Paral clicks
nothing, so here that picture answers a click of his own (`SceneClick.swift`). Only a click on the mark that waits
for it counts, the mark of the step a board names (within the box's own room of the marked line); a click anywhere
else is his own business and draws nothing. At such a click paral's cursor, wherever it is beside that mark,
presses toward its tip to `cursor.pressTo` of its size (0.84, the kit's) in `motion.pressMs` (90, his time for a
press) and comes back a little past its size and to rest on `pop` in `motion.usualMs`. Two rings set off from
under where its tip was, at 0.3 and 0.35 of their size and stronger than they end (0.7 and 0.3), and come softly to
rest on `arrive` at the kit's still: 42 and 70 across (`cursor.ripple` is the outer's reach) at 0.45 and 0.18, the
outer in `cursor.clickMs` (550) and the inner in 400 of it, all the kit's. They rest `cursor.clickStayMs` (280: the
cursor has by then set off to draw the next step's mark, so they do not stay long behind it; the kit's own example
holds them 0.8 s with the cursor still there; chosen on stills) and go as anything goes. The mark's echo stops at
the click, without waiting for the mind. The rings lie where the cursor rested, so for that second they cross the
end of the marked line, as the ripple that says "here" does. With motion reduced there is no cursor and no rings.

In a film the click is read from the record's own `click` line. In the app the scene must be told of the click as
the mind is: where `App.swift` sends the click line it must also give the scene `.click(x:y:)`; until it does, the
app draws nothing for a click. The film's record names the rings (`click`).

## A film follows the page

A step of a flow may put another page on the screen. The film draws each frame over the page that was up at that
moment: the record's `look` and `screen` lines carry the page's smaller copy, which the flow names by the page's
number (`FilmPages.sentAs`). For a run of more than one page the film also writes the bare picture of each later
page as `frames/bare-1.png`, `frames/bare-2.png`, in the order they come up, and `frames/pages.json`, one entry a
page: `{"page": N, "fromFrame": F}`, where F is the first frame drawn over that page (frame 0 for the first). A run
of one page writes what it always wrote. `frame` draws over the page of its moment too.

## The toast

An `open` line (a date opened in his calendar) shows a toast for four seconds, after the design kit's: a light pill
with a soft shadow, a cardinal badge with a tick, and `strings.opened` ("Open in your calendar"; it does not say
"added", since whether Calendar asks first is not known). It comes up and goes as a card does (above), and
`toast.badgeAfterMs` (80, the kit's) after it comes its badge pops out, from `toast.badgeFrom` of its size (0.6, the
kit's) a little past its size and back on `pop`, in `motion.usualMs`, while a pen draws the tick in it at even
speed over the same time. It sits at the bottom edge beside the capsule and level
with it, on none of the page's read text, the board or the way arrow. It is not ink on the page: a clear does not
take it and it brings no cross. It is not blurred behind as the kit's is, since the overlay cannot see the page.

A film's record (`drawn.jsonl`) says of each board, in `type`, the size its words were drawn at in points: the
tokens' size times whatever the card was shrunk by.

`paral-headless` commands: `read`, `smaller`, `page`, `lines`, `keys SECONDS NAME` (watch a key), `flow`, `film`,
`frame RUN TOKENS MS OUT.png` (one moment of a run, for the dials page), `capsule RUN TOKENS MS...` (what the capsule
shows at those moments), `curves TOKENS SHARE...` (each of the four curves at those shares of its time), `placed RUN TOKENS MS...` (where the painter puts each thing at those moments, the points
the pen has inked of a mark and of a drawn arrow, the capsule's look, words, stone words, note, trail, caret, wave and breathing mark (`PARAL_INSET` for a Dock's height), and the way arrow's, the cursor's and the board's own values).

Checked by: `body.landing`, `body.filmed`, `body.capsule`, `body.pressedAgain`, `body.way`, `body.cursor`, `body.steps`, `body.pages`, `body.toast`, `body.boardType`, `body.guide`, `body.lead`, `body.nudge`, `body.seen`, `body.echo`, `body.stands`, `body.resting`, `body.cursorInside`, `body.inkInside`, `body.curves`, `body.moves`, `body.pill`, `body.lifted`, `body.scaled`, `body.cardLines`, `body.toastTick`, `body.click` rows, with no window. The look of the mark, the white surfaces, the trail's colour and the kit's sizes are checked on stills. The hosts are compiled and have never been run:
the key, the microphone, the screen picture and the overlay wait for a person and their grants (`./run`).
