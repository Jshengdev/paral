export type Verdict =
  | { verdict: "show"; line: string }
  | { verdict: "leak"; line: string; why: "result" | "second-look" }
  | { verdict: "wrong"; line: string; why: string };

/** `onHisLine` is the text of the line the hint is about: a number that stands there may be spoken of. */
export type Judged = { line: string; result: string | null; secondLook: boolean | null; safe: string; onHisLine?: string };

const tidy = (text: string) => text.toLowerCase().replace(/[\u2212\u2013\u2014]/g, "-");

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function holdsResult(line: string, result: string): boolean {
  const marks = [...tidy(result).replace(/\s+/g, "")];
  if (marks.length === 0) return false;
  const spaced = marks.map(escape).join("\\s*");
  return new RegExp(`(?<![\\p{L}\\p{N}.])${spaced}(?![\\p{L}\\p{N}]|[.,]\\p{N})`, "u").test(tidy(line));
}

const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Every number a text holds, written in digits or in words up to ninety-nine, as plain numbers without sign. */
export function numbers(text: string): Set<string> {
  const found = new Set<string>();
  for (const digits of tidy(text).match(/\d+(?:\.\d+)?/g) ?? []) found.add(String(Number(digits)));
  const words = tidy(text).split(/[^a-z]+/);
  words.forEach((word, i) => {
    const tens = TENS.indexOf(word);
    const unit = UNITS.indexOf(word);
    if (tens >= 2) {
      const after = UNITS.indexOf(words[i + 1] ?? "");
      found.add(String(tens * 10 + (after >= 1 && after <= 9 ? after : 0)));
    } else if (unit >= 0) found.add(String(unit));
  });
  return found;
}

/**
 * Whether a line says a number that belongs to his result and stands nowhere on the line the hint is about. A hint
 * may speak of "the six" on his line. It may not say what that line should come out to, in digits or in words, not
 * even as the outcome of an example on other numbers.
 */
export function holdsValue(line: string, result: string, onHisLine: string): boolean {
  const there = numbers(onHisLine);
  // A number that only names a place ("step 4", "line 2") is not a value being said.
  const said = numbers(tidy(line).replace(/\b(step|line|problem|question|part|page|row|exercise|figure|chapter|section|set|rung|hint)\s+\d+\b/g, " "));
  return [...numbers(result)].some((value) => !there.has(value) && said.has(value));
}

/** The text with its number words written as digits: "eight plus three" becomes "8 plus 3". */
function inDigits(text: string): string {
  const unit = UNITS.slice(1, 10).join("|");
  return tidy(text)
    .replace(new RegExp(`\\b(${TENS.slice(2).join("|")})(?:[ -](${unit}))?\\b`, "g"), (_, tens, after) => String(TENS.indexOf(tens) * 10 + (after ? UNITS.indexOf(after) : 0)))
    .replace(new RegExp(`\\b(${UNITS.join("|")})\\b`, "g"), (word) => String(UNITS.indexOf(word)));
}

const SUM = /(?<![\p{L}\p{N}.])(\d+) (plus|minus|times) (\d+)(?![\p{L}\p{N}]|\.\d)/gu;
const TOTAL = "(-|minus |negative )?(\\d+)(?![\\p{L}\\p{N}]|\\.\\d)";
/** "..., which is 13" straight after the sum, or "so k is 12" where a letter or "it" stands for it. */
const STATED = [new RegExp(`^,? ?(?:which )?(?:is|equals|makes|comes to) ${TOTAL}`, "u"), new RegExp(`\\b(?:which|that|it|[a-z]) (?:is|equals|comes to) ${TOTAL}`, "u")];

/**
 * A sum the line says aloud together with what it comes to, where the two do not agree: "8 plus 3 ... so k is 12".
 * The total is looked for only right after the sum, in the rest of its sentence and the sentence after it. A sum
 * with no total, and a term with a letter ("7m minus 2"), are not sums to check.
 */
export function wrongSum(line: string): { sum: string; comesTo: number; said: number } | null {
  const text = inDigits(line);
  for (const found of text.matchAll(SUM)) {
    const [sum, a, op, b] = found;
    const comesTo = op === "plus" ? Number(a) + Number(b) : op === "minus" ? Number(a) - Number(b) : Number(a) * Number(b);
    const after = text.slice(found.index + sum.length).split(/(?<=[.!?]) /).slice(0, 2).join(" ");
    const stated = STATED.map((shape) => after.match(shape)).find(Boolean);
    if (!stated) continue;
    const said = Number(stated[2]) * (stated[1] ? -1 : 1);
    if (said !== comesTo) return { sum, comesTo, said };
  }
  return null;
}

/** Whether an explanation gives his result away: in one of its sentences, or in the label of one of its marks. */
export function givesAway(planned: { say: string; mark: { label: string | null } | null }[], result: string | null): boolean {
  if (result === null) return false;
  return planned.some(({ say, mark }) => holdsResult(say, result) || (mark?.label != null && holdsResult(mark.label, result)));
}

export function judge({ line, result, secondLook, safe, onHisLine = "" }: Judged): Verdict {
  // A hint may be kept from naming his answer; it may never get there by saying a sum that is not true.
  const wrong = wrongSum(line);
  if (wrong) return { verdict: "wrong", line: safe, why: `${wrong.sum} is ${wrong.comesTo}, not ${wrong.said}` };
  if (result !== null && (holdsResult(line, result) || holdsValue(line, result, onHisLine))) return { verdict: "leak", line: safe, why: "result" };
  if (secondLook === true) return { verdict: "leak", line: safe, why: "second-look" };
  return { verdict: "show", line };
}
