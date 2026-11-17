/** Him spoken of as someone else: "a user should", "the student is", "the learner's". The word after decides the verb's form. */
const SOMEONE = /\b(the|a) (student|user|learner)('s| is| has| was| wants| asked| needs| should| can)\b/gi;
/** The verb as it is said with "you"; the ones not here are the same for both ("should", "can", "asked"). */
const WITH_YOU: Record<string, string> = { " is": " are", " has": " have", " was": " were", " wants": " want", " needs": " need" };

/**
 * A sentence that speaks of him as someone else ("It lists six things a user should see") is said to him instead:
 * "It lists six things you should see". Only when that word is in none of the sources (his own words, the lines on
 * his screen, the kept pages given with the ask): where a page itself speaks of users or students, the sentence is
 * about them and is left as it was written. Only these wordings are read; any other way of speaking of him as
 * someone else goes by.
 */
export function toHim(text: string, sources: string[]): string {
  return text.replace(SOMEONE, (whole: string, _article: string, noun: string, after: string) => {
    if (sources.some((source) => new RegExp(`\\b${noun}s?\\b`, "i").test(source))) return whole;
    const you = after === "'s" ? "your" : `you${WITH_YOU[after.toLowerCase()] ?? after}`;
    return /^\p{Lu}/u.test(whole) ? you[0].toUpperCase() + you.slice(1) : you;
  });
}
