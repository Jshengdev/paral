import { board as held } from "./judge/board.ts";
import { writtenBoard } from "./judge/written.ts";
import type { Placed } from "./session.ts";
import type { Ask, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C27, a board of words alone. Each run here is made up, with one fault planted in it, to prove
// that the check can fail.
const LINK = "^[a-z0-9-]+(\\.[a-z0-9-]+)+/[a-z0-9]+$";
const BOX_TYPE = 15;
const say = (n: number, at: number, text: string): Moment => ({ at, kind: "say", id: `t2:${n}`, text, opener: false, hint: false, top: false });
const voice = (n: number, at: number, ms: number): Moment => ({ at, kind: "voice", of: `t2:${n}`, ms });
const board = (at: number, lines: string[]): Moment => ({ at, kind: "board", text: lines.join(" | ") });
// Two sentences, four seconds each: the first names one choice, the second another.
const SAID = [say(0, 4000, "My first choice would be lnk.lt: short, and still yours."), voice(0, 5000, 3800), say(1, 4200, "For a clearer name, linklet.link is longer and easier to know."), voice(1, 9000, 3800)];
const TWO = ["lnk.lt/4CQMZu", "linklet.link/4CQMZu"];
/** The film's record of the card: its shape, the size of its words, and how many of its lines are drawn at `at`. */
const film = (at: number, rows: number | undefined, shape: string | null = "words", type = 32): Placed => ({ at, what: "board", id: "t2", box: { x: 600, y: 500, w: 420, h: 60 + (rows ?? 2) * 50 }, shape: shape ?? undefined, type, rows });
const asked = (moments: Moment[]): Ask => ({ index: 1, moments, down: 0, up: 3000 });
const judged = (lines: string[], drawn: Placed[]) => writtenBoard(asked([...SAID, board(4500, lines)]), { written: LINK }, drawn, Infinity, BOX_TYPE);
const GOOD = [film(5200, 1), film(9200, 2)];

const ALONE = "Asked to be shown what it would look like, the board is words alone: no boxes, no arrows";
const EACH = "Each line is a whole example of the thing he asked to see";
const LARGE = "The words are written large";
const ADDED = "Each line is added as the answer comes to it";

// The older check that a board is a drawing of two boxes or more, on a card that holds one written link.
const TWO_BOXES = "The board is a drawing of two boxes or more";
const oneLine = (expect: { written?: string }) => held(asked([...SAID, board(4500, [TWO[0]])]), expect, [], []);

export const WRITTEN_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "one written link on a board of words is not asked for two boxes", check: TWO_BOXES, mustPass: true, verdicts: () => oneLine({ written: LINK }) },
  { name: "a board of boxes cut down to one box is still caught", check: TWO_BOXES, mustPass: false, verdicts: () => oneLine({}) },
  { name: "two links written as words", check: ALONE, mustPass: true, verdicts: () => judged(TWO, GOOD) },
  { name: "each line a whole short link", check: EACH, mustPass: true, verdicts: () => judged(TWO, GOOD) },
  { name: "the two links at twice a box's size and more", check: LARGE, mustPass: true, verdicts: () => judged(TWO, GOOD) },
  { name: "the second link added as the second sentence begins", check: ADDED, mustPass: true, verdicts: () => judged(TWO, GOOD) },
  { name: "one link alone, on the card as it opens", check: ADDED, mustPass: true, verdicts: () => judged([TWO[0]], [film(5200, undefined)]) },
  { name: "the link cut into three boxes with a slash in the middle, as the build draws today", check: ALONE, mustPass: false, verdicts: () => judged(["Short domain → then slash → then code", "e.g. qh.link → / → 4CQMZu"], [film(5200, undefined, null, 15)]) },
  { name: "two links one to a row, and the film drew them as boxes", check: ALONE, mustPass: false, verdicts: () => judged(TWO, [film(5200, 1, "rows"), film(9200, 2, "rows")]) },
  { name: "two links one to a row, and the film names no shape", check: ALONE, mustPass: false, verdicts: () => judged(TWO, [film(5200, 1, null), film(9200, 2, null)]) },
  { name: "a line that describes instead of showing", check: EACH, mustPass: false, verdicts: () => judged(["Short domain, then a slash, then the code", TWO[1]], GOOD) },
  { name: "five links", check: EACH, mustPass: false, verdicts: () => judged([...TWO, "go.lk/4CQMZu", "l.ink/4CQMZu", "sh.rt/4CQMZu"], GOOD) },
  { name: "the links written at a box's size", check: LARGE, mustPass: false, verdicts: () => judged(TWO, [film(5200, 1, "words", 15), film(9200, 2, "words", 15)]) },
  { name: "both links on the card at once", check: ADDED, mustPass: false, verdicts: () => judged(TWO, [film(5200, undefined)]) },
  { name: "both links up before the second sentence begins", check: ADDED, mustPass: false, verdicts: () => judged(TWO, [film(5200, 1), film(6000, 2)]) },
  { name: "the second link added after the answer has ended", check: ADDED, mustPass: false, verdicts: () => judged(TWO, [film(5200, 1), film(20000, 2)]) },
];
