import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Spoken, Voice } from "../ports.ts";

type Log = (line: string) => void;
type Kept = { pcm: Buffer; spoken: Spoken };

/** 16-bit sound at 24 kHz, one channel: 48 bytes to a millisecond. A fifth of a second goes out in each piece. */
const BYTES_A_MS = 48;
const PIECE = 200 * BYTES_A_MS;
/** A sample this far from zero or less is silence (of 32,768). The sound is kept from 10 ms before the first louder one. */
const QUIET = 300;
const LEAD_MS = 10;

/** The sound with the silence at its start taken off, and each word's time moved by as much. */
function trimmed({ pcm, spoken }: Kept): Kept {
  let first = 0;
  while (first + 1 < pcm.length && Math.abs(pcm.readInt16LE(first)) <= QUIET) first += 2;
  const cut = Math.max(0, first - LEAD_MS * BYTES_A_MS) & ~1;
  const earlier = (times: number[]) => times.map((time) => Math.max(0, time - cut / BYTES_A_MS / 1000));
  return { pcm: pcm.subarray(cut), spoken: { words: spoken.words, start: earlier(spoken.start), end: earlier(spoken.end) } };
}

/**
 * A voice that keeps the sound of the lines whose words never change. Such a line is made once by the live voice
 * and kept on disk; after that it is said from the kept sound at once, with no call. A kept sound is named by
 * everything that changes how it sounds (`voiceName`: the service, the model, the voice) and by its words, so when
 * any of them changes the old sound is simply not found and the line is spoken live again. Any other line is spoken live.
 */
export function kept(live: Voice, fixed: string[], voiceName: () => string, dir: string, log: Log): Voice & { ahead(signal: AbortSignal): Promise<void> } {
  const fixedLines = new Set(fixed);
  const at = (text: string) => join(dir, createHash("sha256").update(JSON.stringify([voiceName(), text])).digest("hex").slice(0, 16));
  const read = (text: string): Kept | null => {
    const base = at(text);
    if (!existsSync(`${base}.pcm`) || !existsSync(`${base}.json`)) return null;
    return { pcm: readFileSync(`${base}.pcm`), spoken: JSON.parse(readFileSync(`${base}.json`, "utf8")) };
  };
  /** Speaks a fixed line live, passing the sound on if someone is listening, and keeps it. */
  const make = async (text: string, signal: AbortSignal, onSound: (pcm: Buffer) => void = () => {}, onWords: (spoken: Spoken) => void = () => {}) => {
    const pieces: Buffer[] = [];
    const spoken: Spoken = { words: [], start: [], end: [] };
    await live.say(
      text,
      signal,
      (pcm) => (pieces.push(pcm), onSound(pcm)),
      (more) => (spoken.words.push(...more.words), spoken.start.push(...more.start), spoken.end.push(...more.end), onWords(more)),
    );
    if (signal.aborted || pieces.length === 0) return;
    const whole = trimmed({ pcm: Buffer.concat(pieces), spoken });
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${at(text)}.pcm`, whole.pcm);
    writeFileSync(`${at(text)}.json`, JSON.stringify(whole.spoken));
  };
  return {
    warm: () => live.warm?.(),
    async say(text, signal, onSound, onWords) {
      if (!fixedLines.has(text)) return live.say(text, signal, onSound, onWords);
      const sound = read(text);
      if (sound === null) return make(text, signal, onSound, onWords);
      onWords(sound.spoken);
      for (let from = 0; from < sound.pcm.length && !signal.aborted; from += PIECE) onSound(sound.pcm.subarray(from, from + PIECE));
    },
    /** Makes the sound of every fixed line that has none yet, one at a time, so the first ask finds them ready. */
    async ahead(signal) {
      for (const text of fixedLines) {
        if (signal.aborted) return;
        if (read(text) !== null) continue;
        await make(text, signal).then(
          () => log(`voice: the sound of "${text}" is kept`),
          (error) => signal.aborted || log(`voice: the sound of "${text}" could not be made ahead (${error instanceof Error ? error.message : error}); it will be spoken live`),
        );
      }
    },
  };
}
