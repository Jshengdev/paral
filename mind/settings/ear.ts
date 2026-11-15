import type { Setting } from "./types.ts";

/** Settings for hearing him: the speech-to-text service. */
export const ear = {
  fillerWords: {
    value: ["yeah", "yes", "yep", "yup", "ok", "okay", "um", "uh", "er", "hmm", "mm", "so", "right", "well", "oh", "and", "like", "sure", "cool", "nice"],
    why: "A hold that heard only one or two of these words is not a question: it is him talking to someone else with the key brushed. Nothing is asked, as with a hold that heard no words. A one-word question (\"why\", \"next\", \"help\") is not on the list and is asked.",
    measured: "one hold on the owner's own Mac, 2026-11-14: 0.3 s of sound heard as \"Yeah.\" was answered with three spoken sentences",
  } satisfies Setting<string[]>,

  earModel: {
    value: "ink-2",
    why: "The speech-to-text model, the same service an earlier project of ours uses.",
    measured: "one live ask of 1.7 s (a synthetic voice): partials arrived as it spoke and the final words 101 ms after the release; it heard \"Why is this\" as \"I guessed this\" (2026-11-14, one run)",
  } satisfies Setting<string>,

  earOpenMs: {
    value: 3000,
    why: "How long the ear's connection may take to open before the ask fails loudly.",
    measured: "one open took 537 ms from this Mac (2026-11-14, one run)",
  } satisfies Setting<number>,

  earFinishMs: {
    value: 700,
    why: "After release the mind asks the ear for its last words and waits this long for them, then goes on with what it has and says so in the log. An earlier project of ours found waiting for the ear's own end-of-turn took a median 1,165 ms, so the release ends the turn.",
    measured: "one live ask: the last words arrived 101 ms after the release (2026-11-14, one run)",
  } satisfies Setting<number>,

  cartesiaVersion: {
    value: "2026-08-14",
    why: "The API version the ear and the voice ask for, from the vendor's reference.",
    measured: "not a measurement",
  } satisfies Setting<string>,

  cartesiaCreditCap: {
    value: 50000,
    why: "The ear and the voice stop loudly after this many of the vendor's credits since the mind started (the ear costs 3 a second of sound, the voice 1 a character). A credit's price depends on the plan, so the cap is in credits.",
    measured: "not measured; a five-second ask and a 300-character answer come to about 315 credits",
  } satisfies Setting<number>,
};
