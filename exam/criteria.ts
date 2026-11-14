// What paral must do. C1 to C15 are what the person in the video does with DuckyHelper (youtu.be/PHswiY3YUO0, times in
// the scenarios). C16 is the team's own and C17 is ours. U2 to U7 are checks of use, with their sources in src/judge/.
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
  "The real windows floating over his apps. The film is drawn by the same painter, off screen.",
];

// What only a person at the Mac can do. Printed on the explainer beside what the films do not prove.
export const WAITING = [
  "The first look on a real screen: the real key, the microphone, the screen picture and the windows over real apps.",
  "The Mac's permissions for that first look. Nothing here asked for one.",
  "Whether the panel shows the hint's number, as in \"hint 1 of 4\".",
  "The look. The colours, type and motion are one tokens file, tuned on the dials page.",
];
