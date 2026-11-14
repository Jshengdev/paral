import type { Voice } from "../ports.ts";

/**
 * A voice that fails on purpose. The outside judge asks for it (PARAL_FAULT=voice) to check that with the voice down
 * the words still show and the marks still draw. It is never used otherwise.
 */
export const silenced: Voice = {
  say: async () => Promise.reject(new Error("the voice was switched off for this run (PARAL_FAULT=voice)")),
};
