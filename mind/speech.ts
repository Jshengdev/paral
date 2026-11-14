import type { Hands } from "./ask.ts";
import { SEAM_VERSION } from "../seam/schema.ts";

const v = SEAM_VERSION;
/** The voice's sound is 16-bit at 24 kHz, one channel: 48 bytes to a millisecond. */
const BYTES_A_MS = 48;

/**
 * The voice for one ask: sentences are spoken one after another, and a failure turns the rest of the answer to words
 * only. It also knows when what has been said so far will have been heard, so a wait can be told from a sentence.
 */
export function speech({ ports, send, log }: Hands, id: string, signal: AbortSignal) {
  let muted = false;
  let queue = Promise.resolve();
  let onTheirWay = 0;
  let soundEnds = 0;
  let lastAsked = 0;
  const mute = (why: string) => {
    if (muted) return;
    muted = true;
    send({ v, type: "mute", id, why });
  };
  return {
    speak(beat: number, text: string) {
      lastAsked = Date.now();
      if (ports.voice === null) return mute("no voice is set up");
      const voice = ports.voice;
      onTheirWay++;
      queue = queue
        .then(async () => {
          if (muted || signal.aborted) return;
          let begins = 0;
          let bytes = 0;
          try {
            await voice.say(
              text,
              signal,
              (pcm) => {
                if (signal.aborted) return;
                // Sound plays in order: this sentence starts now, or when the one before it has finished.
                if (bytes === 0) begins = Math.max(Date.now(), soundEnds);
                bytes += pcm.length;
                soundEnds = begins + bytes / BYTES_A_MS;
                send({ v, type: "voice", id, beat, pcm: pcm.toString("base64") });
              },
              (spoken) => signal.aborted || send({ v, type: "words", id, beat, ...spoken }),
            );
            if (!signal.aborted) send({ v, type: "voice", id, beat, pcm: "", last: true });
          } catch (error) {
            if (signal.aborted) return;
            log(`${id}: the voice failed on beat ${beat} (${error instanceof Error ? error.message : error}); going on with words only`);
            mute("the voice failed, so this answer is words only");
          }
        })
        .finally(() => void onTheirWay--);
    },
    /**
     * The moment everything said so far will have been heard, or null while nothing has been said or a sentence's
     * sound is still on its way. With no voice it is the moment the last line was shown.
     */
    quietAt(): number | null {
      if (lastAsked === 0) return null;
      if (muted || ports.voice === null) return lastAsked;
      return onTheirWay > 0 || soundEnds === 0 ? null : soundEnds;
    },
    finished: () => queue,
  };
}
