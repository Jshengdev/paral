/** Signs that a line the fast model wrote is not fit to say aloud. Each has the reason it is here. */
const UNFIT: [RegExp, string][] = [
  [/\bNONE\b/, 'it holds the word that means "no line"'],
  [/^\W*none\W*$/i, 'it is only the word that means "no line"'],
  [/\b(the|a|this|that) (student|user|learner|person)\b/i, "it speaks about him, not to him"],
  [/\b(student|user|learner)'s\b/i, "it speaks about him, not to him"],
  [/\bI(['’]ll| will| should| am going to) (say|write|answer|respond|output)\b/i, "it talks about what it is doing"],
  [/\b(as an AI|my instructions|these instructions|the instructions|the tutor|second line|the prompt)\b/i, "it talks about itself"],
];

/**
 * Why a line the fast model wrote must not be said, or null when it may. A line that explains itself, speaks about
 * him in the third person, or carries the word for "no line" anywhere is dropped. It errs toward dropping: a dropped
 * quick line is replaced by the fixed line.
 */
export function unfit(line: string): string | null {
  return UNFIT.find(([sign]) => sign.test(line))?.[1] ?? null;
}

/**
 * Whether a failure's message may be shown in the capsule: one short line of plain words. A shape error, a stack or
 * anything long is not his to read; he is shown a fixed line instead and the message goes to the log.
 */
export function showable(message: string): boolean {
  return message.trim() !== "" && message.length <= 140 && !/[{}[\]\n]|\b(undefined|null|NaN|TypeError|at \w+ \()/.test(message);
}
