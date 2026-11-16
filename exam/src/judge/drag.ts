import type { Placed } from "../session.ts";
import type { Expect } from "../shape.ts";
import type { Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C26: he can drag the board by its top strip, and it stays where he puts it. His click of 2026-11-15, 18:47, from
// the reference's video and its help page:
//   23:51           the board has its first row
//   23:54 to 23:56  his pointer is a hand on the short strip at the top of the card, and the card moves up and to
//                   the right with it
//   23:57 to 24:19  five more rows are added and the card stays where he left it, growing downward
//   its help page   "Drag the board by its top strip to move it. It stays where you put it."
//
// The scenario scripts the drag (how far) and one press beside the strip, which must move nothing. Where the board
// is at each moment is the film's to say: its record lists the board's box at every change, and names the strip.
// What a film cannot show is the real window taking the mouse; that needs his own hand on his real screen.

// The painter rounds a box to half a point; a drag of whole points lands within one.
const NEAR = 1;
// A drag is one movement: the film lists the board every frame it moves, 33 ms apart. A move that comes more than
// half a second after the one before it is not his drag going on; it is the board moving by itself.
const PAUSE_MS = 500;
const at = (p: Placed) => `${Math.round(p.box.x)}, ${Math.round(p.box.y)}`;

/** `until` is where this ask's stretch of the film ends. */
export function dragged(ask: Ask, expect: Expect, placed: Placed[], until: number): Verdict[] {
  if (!expect.drag) return [];
  const s = ask.index;
  const [dx, dy] = expect.drag.by;
  const mine = (what: string) => placed.filter((p) => p.what === what && p.at >= ask.down && p.at < until);
  const board = mine("board");
  const moved = "Dragged by its strip, the board goes where his pointer goes";
  if (board.length === 0) return [no("C26", s, moved, "no board was drawn")];
  const first = board[0], last = board.at(-1)!;
  const places = board.filter((p, i) => i === 0 || Math.abs(p.box.x - board[i - 1].box.x) > NEAR || Math.abs(p.box.y - board[i - 1].box.y) > NEAR);
  const wentX = last.box.x - first.box.x, wentY = last.box.y - first.box.y;
  const landed = Math.abs(wentX - dx) <= NEAR && Math.abs(wentY - dy) <= NEAR;
  const measured = `from ${at(first)} to ${at(last)}: ${Math.round(wentX)} across and ${Math.round(wentY)} down, for a drag of ${dx} and ${dy}`;
  const withHim = "It moves with his pointer, not in one jump";
  const settles = places.at(-1)!;
  const after = board.filter((p) => p.at > settles.at);
  const moves = places.slice(1);
  const again = moves.find((p, i) => i > 0 && p.at - moves[i - 1].at > PAUSE_MS);
  const stays = "It stays where he let go, and what is drawn next is drawn there";
  const strip = mine("strip").filter((p) => (p.id ?? "").startsWith(`${last.id}/`)).at(-1);
  const has = "The board has a strip at its top to take hold of";
  const onTop = strip && strip.box.x >= last.box.x - NEAR && strip.box.x + strip.box.w <= last.box.x + last.box.w + NEAR && strip.box.y >= last.box.y - NEAR && strip.box.y + strip.box.h <= last.box.y + last.box.h / 2;
  return [
    landed ? yes("C26", s, moved, measured) : no("C26", s, moved, measured),
    !landed ? unseen("C26", s, withHim, "it did not land where he dragged it") : places.length >= 4 ? yes("C26", s, withHim, `${places.length - 1} places on the way`) : no("C26", s, withHim, `${places.length - 1} ${places.length === 2 ? "place" : "places"} on the way`),
    !landed ? unseen("C26", s, stays, "it did not land where he dragged it")
      : again ? no("C26", s, stays, `it moved again at ${Math.round(again.at)} ms, to ${at(again)}, after he had let go`)
      : after.length === 0 ? unseen("C26", s, stays, "nothing was drawn on the board after he let go")
      : after.some((p) => p.box.h > settles.box.h + NEAR) ? yes("C26", s, stays, `${after.length} later drawings of the board, all at ${at(settles)}, the card grown from ${Math.round(settles.box.h)} to ${Math.round(after.at(-1)!.box.h)} pt`)
      : yes("C26", s, stays, `${after.length} later drawings of the board, all at ${at(settles)}`),
    !strip ? no("C26", s, has, "the film's record names no strip") : onTop ? yes("C26", s, has, `${Math.round(strip.box.w)} by ${Math.round(strip.box.h)} pt, in the top of the card`) : no("C26", s, has, "the strip is not in the top of the card"),
  ];
}
