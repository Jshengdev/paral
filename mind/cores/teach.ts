import { NO_RUNG } from "./hold.ts";

export type Happened = "asked" | "asked-again" | "just-tell-me" | "changed-still-wrong";

export type Move = { rung: number; fresh: boolean };

export function next(rung: number, happened: Happened, rungs: number): Move {
  const top = rungs - 1;
  if (rung === NO_RUNG) return { rung: 0, fresh: false };
  if (happened === "changed-still-wrong") return { rung, fresh: true };
  if (rung >= top) return { rung: top, fresh: true };
  return { rung: rung + 1, fresh: false };
}
