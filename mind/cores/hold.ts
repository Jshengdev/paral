export type Lesson = {
  problem: string | null;
  breakLine: string | null;
  breakRead: string | null;
  tried: string[];
  rung: number;
  shown: string[];
  /** What paral has drawn that is still on his screen, in words the model can read. */
  drawn: string[];
  /** The steps of the working given so far, when he has asked to have the exercise worked through; absent otherwise. */
  steps?: string[];
  /** Whether the last step given said what the working gives, so the walk is over. */
  worked?: boolean;
};

export type HoldEvent =
  | { type: "problem.read"; text: string }
  | { type: "break.found"; line: string; read: string | null }
  | { type: "he.tried"; words: string }
  | { type: "rung.given"; rung: number }
  | { type: "line.shown"; text: string }
  | { type: "break.fixed" }
  | { type: "mark.drawn"; kind: string; line: string }
  | { type: "board.drawn"; rows: string[][] }
  | { type: "clip.drawn"; name: string }
  | { type: "wiped" }
  | { type: "step.given"; step: string; last: boolean };

export const NO_RUNG = -1;

export const empty: Lesson = { problem: null, breakLine: null, breakRead: null, tried: [], rung: NO_RUNG, shown: [], drawn: [] };

const on = (line: string) => ` on "${line}"`;
const BOARD = "board reading ";
const CLIP = "lesson clip of ";
/** The board and the clip share one place on his screen, so a new one takes the old one's place. */
const besideTheBoard = (thing: string) => !thing.startsWith(BOARD) && !thing.startsWith(CLIP);

export function fold(lesson: Lesson, event: HoldEvent): Lesson {
  switch (event.type) {
    case "problem.read":
      return { ...empty, problem: event.text };
    case "break.found":
      return { ...lesson, breakLine: event.line, breakRead: event.read };
    case "he.tried":
      return { ...lesson, tried: [...lesson.tried, event.words] };
    case "rung.given":
      return { ...lesson, rung: event.rung };
    case "line.shown":
      return lesson.shown.includes(event.text) ? lesson : { ...lesson, shown: [...lesson.shown, event.text] };
    case "break.fixed":
      return { ...lesson, breakLine: null, breakRead: null, tried: [], rung: NO_RUNG };
    case "mark.drawn":
      return { ...lesson, drawn: [...lesson.drawn.filter((thing) => !thing.endsWith(on(event.line))), `${event.kind}${on(event.line)}`] };
    case "board.drawn":
      return { ...lesson, drawn: [...lesson.drawn.filter(besideTheBoard), BOARD + event.rows.map((row) => row.join(" then ")).join(" / ")] };
    case "clip.drawn":
      return { ...lesson, drawn: [...lesson.drawn.filter(besideTheBoard), CLIP + event.name] };
    case "wiped":
      return { ...lesson, drawn: [] };
    case "step.given":
      return { ...lesson, steps: [...(lesson.steps ?? []), event.step], worked: event.last };
  }
}
