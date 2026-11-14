import { sameness, type ReadLine } from "./ground.ts";
import type { Happened } from "./teach.ts";

export type Seen = { hasBreak: boolean; breakRead: string | null; words: string; lines: ReadLine[] };

export function happened({ hasBreak, breakRead, words, lines }: Seen, justTellMe: string[], sameLineScore: number): Happened {
  if (!hasBreak) return "asked";
  const said = words.toLowerCase();
  if (justTellMe.some((phrase) => said.includes(phrase))) return "just-tell-me";
  if (breakRead === null) return "asked-again";
  const unchanged = lines.some((line) => sameness(breakRead, line.text) >= sameLineScore);
  return unchanged ? "asked-again" : "changed-still-wrong";
}
