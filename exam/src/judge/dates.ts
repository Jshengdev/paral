import type { Expect, Truth } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, yes, type Verdict } from "../verdict.ts";

// A date is a month and a day, as "March 1", "Mar 1st" or "December 9-16". A wrong date costs a student a deadline,
// so three things are held: a date the scenario names is said as the page writes it, no date is said that it has
// no page for, and where the scenario asks it, the answer says what the date means for him (that it has passed).
// His words of 2026-11-14: it may say a date that is not on the page in front of him when it read it on another
// page, and it "shouldn't say things that doesn't have information on". Today the page on screen is the only one
// it reads, so that page is the whole of `truth`; when it reads others, their lines join it.
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH = new RegExp(`\\b(${MONTHS.join("|")}|${MONTHS.map((m) => m.slice(0, 3)).join("|")}|sept)\\b\\.?`, "gi");
const key = (month: string) => month.toLowerCase().slice(0, 3);

/** Each month in the text with the day numbers written after it: "December 5 through 8" gives dec 5 and dec 8. */
function dates(text: string): { month: string; day: number; said: string }[] {
  const found = [...text.matchAll(MONTH)];
  return found.flatMap((m, index) => {
    const from = (m.index ?? 0) + m[0].length;
    const until = Math.min(index + 1 < found.length ? found[index + 1].index ?? text.length : text.length, from + 40);
    const days = [...text.slice(from, until).matchAll(/\b([12]?\d|3[01])(?:st|nd|rd|th)?\b(?!:)/g)].map((d) => Number(d[1])).filter((d) => d >= 1 && d <= 31);
    return days.map((day) => ({ month: key(m[1]), day, said: `${m[1]} ${day}` }));
  });
}

// As the page writes it: the same letters and digits, with "1st" read as "1" and commas and case let go.
const plain = (text: string) => text.toLowerCase().replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1").replace(/[,.]/g, " ").replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim();

const answerOf = (ask: Ask) => [...of(ask.moments, "say").filter((m) => !m.opener).map((m) => m.text), ...of(ask.moments, "mark").map((m) => m.label ?? ""), ...of(ask.moments, "board").map((m) => m.text)].join(" ");

/** What the judge holds about dates in one answer. */
export function datesSaid(ask: Ask, expect: Expect, truth: Truth[]): Verdict[] {
  const s = ask.index;
  const answer = answerOf(ask);
  const out: Verdict[] = [];
  for (const phrase of expect.says ?? []) {
    const what = `It says "${phrase}", as the page writes it`;
    out.push(plain(answer).includes(plain(phrase)) ? yes("C13", s, what, "it does") : no("C13", s, what, `it said: "${answer.slice(0, 110)}"`));
  }
  for (const phrase of expect.neverSays ?? []) {
    const what = `It never says "${phrase}"`;
    out.push(plain(answer).includes(plain(phrase)) ? no("C13", s, what, `it said: "${answer.slice(0, 110)}"`) : yes("C13", s, what, "it does not"));
  }
  if (expect.saysThat) {
    // Whole words only: "ago" is not in "Chicago". The list is a sign, not the meaning; a reader reads every pass.
    const sign = expect.saysThat.anyOf.find((word) => new RegExp(`\\b${plain(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(plain(answer)));
    const what = `It says that ${expect.saysThat.what}`;
    out.push(sign ? yes("C13", s, what, `it says "${sign}"`) : no("C13", s, what, `none of "${expect.saysThat.anyOf.join('", "')}" in: "${answer.slice(0, 110)}"`));
  }
  const said = dates(answer);
  if (said.length === 0 || truth.length === 0) return out;
  const shown = new Set(truth.flatMap((t) => dates(t.text)).map((d) => `${d.month} ${d.day}`));
  const madeUp = said.filter((d) => !shown.has(`${d.month} ${d.day}`));
  const what = "Every date it says is on a page it read";
  return [...out, madeUp.length === 0 ? yes("C13", s, what, `${said.length} dates, each on the page in front of him`) : no("C13", s, what, `it said ${madeUp[0].said}, which is on no page it read`)];
}
