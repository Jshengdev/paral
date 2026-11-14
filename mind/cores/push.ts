export type Verdict =
  | { verdict: "show"; line: string }
  | { verdict: "leak"; line: string; why: "result" | "second-look" };

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

export function judge({ line, result, secondLook, safe, onHisLine = "" }: Judged): Verdict {
  if (result !== null && (holdsResult(line, result) || holdsValue(line, result, onHisLine))) return { verdict: "leak", line: safe, why: "result" };
  if (secondLook === true) return { verdict: "leak", line: safe, why: "second-look" };
  return { verdict: "show", line };
}
