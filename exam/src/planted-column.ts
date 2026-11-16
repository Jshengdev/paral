import { column } from "./judge/column.ts";
import type { Placed } from "./session.ts";
import type { Ask, Moment } from "./timeline.ts";
import type { Verdict } from "./verdict.ts";

// The planted cases of C25, a chain of steps drawn as one column. Each run here is made up, with one fault planted
// in it, to prove that the check can fail.
const STEPS = ["Authenticate", "Rate limit", "Parse", "Validate", "Allocate", "Respond|Return"];
const board = (at: number, rows: string[][]): Moment => ({ at, kind: "board", text: rows.map((row) => row.join(" → ")).join(" | ") });
/** The film's record of the board. `shape` null: the film names none, as today's build does. */
const film = (shape: string | null): Placed => ({ at: 5000, what: "board", id: "t2", box: { x: 600, y: 300, w: 220, h: 420 }, shape: shape ?? undefined });
const asked = (moments: Moment[]): Ask => ({ index: 1, moments, down: 0, up: 2000 });
const COLUMN = [["Request comes in"], ["Authenticate"], ["Rate limit"], ["Parse body"], ["Validate address"], ["Allocate code"], ["Return short address"]];
/** The film's record of a column's boxes and arrows: `n` boxes one under another. `fault` plants one thing wrong. */
function stood(n: number, fault?: "beside" | "few boxes" | "no arrows"): Placed[] {
  const count = fault === "few boxes" ? n - 2 : n;
  const boxes = Array.from({ length: count }, (_, i): Placed => ({ at: 5000, what: "box", id: `t2/${i}`, box: fault === "beside" && i === 3 ? { x: 780, y: 320 + 2 * 54, w: 160, h: 36 } : { x: 630, y: 320 + i * 54, w: 160, h: 36 } }));
  const joins = fault === "no arrows" ? [] : Array.from({ length: count - 1 }, (_, i): Placed => ({ at: 5000, what: "join", id: `t2/${i}-${i + 1}`, box: { x: 709, y: 356 + i * 54, w: 2, h: 18 } }));
  return [...boxes, ...joins];
}
const judged = (boards: Moment[], shape: string | null = "column", expect: string[] | false = STEPS, drawn: Placed[] = stood(7)) => column(asked(boards), { column: expect }, [film(shape), ...drawn], Infinity);

const ONE = "Asked to draw the steps, the board is one column: a box to a row";
const JOINED = "The boxes are joined downward";
const EACH = "There is a box for each step of the page's list, in the page's order";
const WHOLE = "The column comes whole, with the sentence that brings it";
const ACROSS = "A drawing of how things connect keeps its rows of boxes joined across";

export const COLUMN_CASES: { name: string; check: string; mustPass: boolean; verdicts: () => Verdict[] }[] = [
  { name: "seven boxes, one to a row", check: ONE, mustPass: true, verdicts: () => judged([board(5000, COLUMN)]) },
  { name: "seven boxes the film says are joined downward", check: JOINED, mustPass: true, verdicts: () => judged([board(5000, COLUMN)]) },
  { name: "the request, then the page's six steps in order", check: EACH, mustPass: true, verdicts: () => judged([board(5000, COLUMN)]) },
  { name: "the column is whole on the card as it opens", check: WHOLE, mustPass: true, verdicts: () => judged([board(5000, COLUMN)]) },
  { name: "the six steps as two rows of three, as the build draws today", check: ONE, mustPass: false, verdicts: () => judged([board(5000, [["Authenticate", "Rate limit", "Parse body"], ["Validate address", "Allocate code", "Return short address"]])], null) },
  { name: "one box to a row, and the film draws them as separate rows", check: JOINED, mustPass: false, verdicts: () => judged([board(5000, COLUMN)], "rows") },
  { name: "one box to a row, and the film names no shape", check: JOINED, mustPass: false, verdicts: () => judged([board(5000, COLUMN)], null) },
  { name: "the film says column, and one box stands beside the one before it", check: JOINED, mustPass: false, verdicts: () => judged([board(5000, COLUMN)], "column", STEPS, stood(7, "beside")) },
  { name: "the film says column and names five boxes for seven", check: JOINED, mustPass: false, verdicts: () => judged([board(5000, COLUMN)], "column", STEPS, stood(7, "few boxes")) },
  { name: "the film says column and no arrow joins the boxes", check: JOINED, mustPass: false, verdicts: () => judged([board(5000, COLUMN)], "column", STEPS, stood(7, "no arrows")) },
  { name: "a column of three boxes for six steps", check: EACH, mustPass: false, verdicts: () => judged([board(5000, [["Authenticate"], ["Validate address"], ["Return short address"]])]) },
  { name: "the six steps with two of them the wrong way round", check: EACH, mustPass: false, verdicts: () => judged([board(5000, [["Authenticate"], ["Parse body"], ["Rate limit"], ["Validate address"], ["Allocate code"], ["Return short address"]])]) },
  { name: "ten boxes for six steps", check: EACH, mustPass: false, verdicts: () => judged([board(5000, [...COLUMN, ["Log the call"], ["Count the click"], ["Done"]])]) },
  { name: "a column that grows a box as each sentence is said", check: WHOLE, mustPass: false, verdicts: () => judged([board(5000, COLUMN.slice(0, 2)), board(9000, COLUMN.slice(0, 4)), board(13000, COLUMN)]) },
  { name: "a first question about how things connect, drawn as rows", check: ACROSS, mustPass: true, verdicts: () => judged([board(5000, [["Sign up", "Dashboard"], ["Create link", "Short address"]])], null, false) },
  { name: "a follow-up that asks how things connect, drawn as a column of the page's list", check: ACROSS, mustPass: false, verdicts: () => column({ index: 1, moments: [board(5000, [["Homepage"], ["Login"], ["Sign up"], ["Create link"], ["Visit"], ["Stats"]])], down: 0, up: 2000 }, { column: false }, [film("column"), ...stood(6)], Infinity) },
  { name: "a first question about how things connect, drawn as a column", check: ACROSS, mustPass: false, verdicts: () => judged([board(5000, [["Sign up"], ["Dashboard"], ["Create link"], ["Short address"]])], "column", false) },
];
