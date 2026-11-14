import type { Setting } from "./types.ts";

/** Settings for the deep model, the second look, and what they may cost. */
export const brain = {
  brainModel: {
    value: "claude-opus-5-5",
    why: "The model that reads the student's work and writes the hint. Reading a page of working correctly matters more than speed until the times are measured, so this is the current Opus.",
    measured: "same real ask, two runs each, 2026-11-14: this model's first field came at 2.6 to 3.1 s, its first sentence at 4.2 to 4.4 s, the whole answer at 5.2 to 5.6 s, about $0.03 an ask; claude-sonnet-5-5 gave 1.8 to 1.9 s, 2.8 to 3.2 s, 3.6 to 3.8 s at about $0.015; claude-haiku-5-5 was slowest (first field at 5.8 to 6.9 s) and answered a different question. His to choose",
  } satisfies Setting<string>,

  brainEffort: {
    value: "low",
    why: "How hard the brain thinks before it answers. Low, because the student is waiting; an earlier project of ours runs the same model at low effort.",
    measured: "one live ask at low effort on a 1600 by 1000 page: the answer came in 5,127 ms and cost $0.019; it found the right line and gave a first-rung hint (2026-11-14, one run). To be re-set from the landing count on real pages",
  } satisfies Setting<"low" | "medium" | "high" | "xhigh" | "max">,

  brainMaxTokens: {
    value: 16000,
    why: "Room for the brain's thinking and its short reply in one response that is not streamed.",
    measured: "not measured",
  } satisfies Setting<number>,

  secondLookModel: {
    value: "claude-haiku-5-5",
    why: "A yes-or-no judgement on one line, made after the main answer. A small fast model keeps the extra wait short.",
    measured: "one live call: 1,258 ms (2026-11-14, one run); an earlier project of ours saw its small model's first sentence 168 to 604 ms after the send",
  } satisfies Setting<string>,

  secondLookEffort: {
    value: "low",
    why: "The second look is one short judgement and should add as little wait as it can.",
    measured: "not measured",
  } satisfies Setting<"low" | "medium" | "high" | "xhigh" | "max">,

  secondLookMaxTokens: {
    value: 4000,
    why: "Room for the second look's thinking and its one-word verdict.",
    measured: "not measured",
  } satisfies Setting<number>,

  pricesUsdPerMTok: {
    value: { "claude-opus-5-5": { input: 4, output: 20 }, "claude-haiku-5-5": { input: 0.1, output: 0.5 } } as Record<string, { input: number; output: number }>,
    why: "Used only to count what the live brain has spent against the cap. Dollars per million tokens.",
    measured: "from the API reference cached 2026-11-03; not checked against a bill",
  } satisfies Setting<Record<string, { input: number; output: number }>>,

  lostAnswerLine: {
    value: "I lost that answer on my side. Ask me again.",
    why: "What he sees when an ask fails for a reason that is not his to read: a reply that does not fit its shape, a reply with no sentences, a fault in the code. The real reason, and the reply's own text, go to the log.",
    measured: "one live ask showed a raw shape error in the capsule (2026-11-14, the outside judge's reading)",
  } satisfies Setting<string>,

  declinedLine: {
    value: "I can't help with that one.",
    why: "What he sees when the model declines an ask.",
    measured: "not measured; no live ask has been declined",
  } satisfies Setting<string>,

  spendCapUsd: {
    value: 5,
    why: "The live brain stops loudly when this much has been spent since the mind started, so a loop or a long night cannot run up a bill.",
    measured: "not measured here; one answer turn cost about $0.023 to $0.026 on an earlier project's bench, so this is roughly two hundred asks",
  } satisfies Setting<number>,
};
