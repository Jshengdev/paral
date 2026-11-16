import { asksFor } from "./catch.ts";

/**
 * Whether an ask is a broad follow-up: an answer came before it in this conversation (`shown`, the sentences said
 * since the problem was read), and his words ask for more than one thing ("would you add anything else?", "what
 * would we do next?"). A first question in the same words is an ordinary ask.
 */
export function broadFollowUp(words: string, phrases: string[], shown: string[]): boolean {
  return shown.length > 0 && asksFor(words, phrases);
}
