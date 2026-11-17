/**
 * How the voice paces a sentence, in ms: for each letter (spaces and signs count), more for each digit, for each
 * comma, semicolon or colon, for each letter of a code in capitals ("RNR01", "GPA") and of an address
 * ("wies@usc.edu"), and a start. `most` is how long a sentence may be estimated to take before it is tried for a cut.
 */
export type Pace = { most: number; letter: number; digit: number; stop: number; code: number; address: number; base: number };

const lengths = (text: string, what: RegExp) => (text.match(what) ?? []).reduce((sum, found) => sum + found.length, 0);

/** About how long the voice takes to say a sentence, in ms, from its text alone. An estimate: see `sentenceMaxWords`. */
export function sayMs(text: string, pace: Pace): number {
  const digits = lengths(text, /\d/g);
  const stops = lengths(text, /[,;:]/g);
  const codes = lengths(text, /\b[A-Z]{2,}\d*\b|\b[A-Z]+\d+\b/g);
  const addresses = lengths(text, /\S+@\S+|\b[\w.]+\.(?:edu|com|org)\b/g);
  return Math.round(pace.base + pace.letter * text.length + pace.digit * digits + pace.stop * stops + pace.code * codes + pace.address * addresses);
}
