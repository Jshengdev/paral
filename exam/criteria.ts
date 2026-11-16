// What paral must do. C1 to C15 are what the person in the video does with DuckyHelper (youtu.be/PHswiY3YUO0, times in
// the scenarios). C16 is the team's own and C17 is ours. C18 is the look he chose on 2026-11-14 at
// 19:02, made quieter by his click of 2026-11-15, 14:55: a look draws no board. C21 to C23 are three more things the
// video shows, written from the whole of it and made bars by his click of 2026-11-15, 16:26 (sources in src/judge/video.ts).
// C24 to C29 are six more, found when the video was read one frame a second and every second of it measured, and made
// bars by his click of 2026-11-15, 18:47. Each is written here when its check is (C25: src/judge/column.ts; C26: src/judge/drag.ts; C27: src/judge/written.ts; C28: src/judge/label.ts).
// U2 to U7 are checks of use, with their sources in src/judge/.
export const CRITERIA: Record<string, string> = {
  C1: "At rest, one small circle sits at the bottom centre, above other apps.",
  C2: "He holds the key and talks. The circle widens and his words show as he says them.",
  C3: "With a second key held, a trail follows his pointer and fades. The tutor gets the picture with his path on it.",
  C4: "He lets go. It shows it is thinking, at once.",
  C5: "It opens with one short line that names what it will do.",
  C6: "A mark lands on the thing he means: a ring, an underline, a wavy underline, or a bracket with a label.",
  C7: "The answer comes sentence by sentence, in the capsule and aloud, in the same words.",
  C8: "A blackboard opens in an empty part of the page, one row per sentence.",
  C9: "At the end it rests again. Its marks and its board stay.",
  C10: "A follow-up knows what was said and what is drawn.",
  C11: "He holds the key during an answer. The voice stops at once and it listens.",
  C12: "He circles and says nothing. It answers with one short line, and draws nothing.",
  C13: "It answers about the page in front of him, from one picture.",
  C14: "Closing it clears its marks.",
  C15: "If the voice fails, the words still show and the marks still draw.",
  C16: "The team's own: when his work has a break, a hint first, one step up per ask, never the result.",
  C17: "Ours: for a hard idea, a short rendered lesson plays on the board, on numbers that are not his.",
  C18: "With no key pressed, on a page it has read, it shows one true line and marks where the thing is. It draws no board: what is ahead is drawn when he asks. Elsewhere it stays quiet.",
  C19: "He asks it to keep a date. A calendar file for that date opens, and his own click adds it.",
  C20: "He says \"show me\". It walks what is ahead one step at a time: the step named on the board, said in one sentence, and marked or pointed to.",
  C21: "It says what the page in front of him cannot show it or prove.",
  C22: "Asked for the whole thing drawn, its board grows to as many rows as it has sentences, four to six, a row at a time.",
  C23: "A broad follow-up, one that asks what else or what next, gets six sentences or more.",
  C25: "Asked to draw the steps it has just explained, it draws them as one column: a box for each step, joined downward, all at once.",
  C26: "He can drag the board by the strip at its top, and it stays where he puts it.",
  C27: "Asked to be shown what a thing would look like, its board is words alone: each example written large, a line at a time.",
  C28: "A small label beside the open capsule names the key to hold, and says it is working for a moment after he lets go.",
  U2: "Use: its first words come within a second of release.",
  U3: "Use: there is never a long silence with nothing new on screen.",
  U4: "Use: a mark never covers the words it marks.",
  U5: "Use: its ink never covers other text on the page.",
  U6: "Use: it speaks to him about his page, never about its own workings.",
  U7: "Use: a mark is drawn by a pen over time. It never pops in.",
};

// What these films do not prove, said on the explainer so nobody reads a film as more than it is.
export const NOT_LIVE = [
  "The real key press. The run scripts the key's times.",
  "His microphone. The ask is a recorded sound, heard by the real ear service.",
  "A capture of his real screen. The page is a prepared picture, read by the Mac's own text reading.",
  "The app's own watcher, which takes a picture of the display every few seconds with no key pressed. The run scripts each look.",
  "Calendar. The run sees the calendar file handed to the Mac and what is in it, not what Calendar does with it.",
  "The real windows floating over his apps. The film is drawn by the same painter, off screen.",
];

// What only a person at the Mac can do. Printed on the explainer beside what the films do not prove.
export const WAITING = [
  "The real screen. He has run it on his own Mac since 2026-11-14, 18:15: the key, the microphone, the screen picture, and from 19:57 the looks with no key. What he saw and heard there is his to say; the films cannot.",
  "The arrow, the cursor and \"show me\" on a real screen, with the Dock, the menu bar and a browser's own bars in the picture.",
  "Calendar: his own click on Add, after the calendar file opens.",
  "Whether the panel shows the hint's number, as in \"hint 1 of 4\".",
  "The look. The colours, type and motion are one tokens file, tuned on the dials page.",
];
