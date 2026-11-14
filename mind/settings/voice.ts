import type { Setting } from "./types.ts";

/** Settings for speaking: the text-to-speech service. */
export const voice = {
  voiceModel: {
    value: "sonic-3.6",
    why: "The text-to-speech model, the same service an earlier project of ours uses.",
    measured: "two live sentences: first sound 369 ms on a cold connection and 93 ms warm; 3.8 s of sound arrived in 0.7 s (2026-11-14, one run)",
  } satisfies Setting<string>,

  voiceId: {
    value: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    why: "A stock voice (Jacqueline, en-US) named on the vendor's own model page. A stock voice, because a cloned one made before the event would be earlier work.",
    measured: "not a measurement; his to change",
  } satisfies Setting<string>,

  voiceFirstSoundMs: {
    value: 2500,
    why: "If the voice sends no sound for a sentence inside this limit, the answer goes on as words only and says so.",
    measured: "not measured here; an earlier project of ours saw the first chunk in 74 to 208 ms on a warm connection, and a connection that opened and never answered",
  } satisfies Setting<number>,
};
