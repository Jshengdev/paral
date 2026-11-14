import { readFile } from "node:fs/promises";

// The film's voice as numbers, so the judge can tell sound from silence. A plain 16-bit WAV, as ./film writes it.
export type Sound = { rate: number; channels: number; samples: Int16Array };

export async function sound(wav: string): Promise<Sound> {
  const bytes = await readFile(wav);
  const data = bytes.indexOf("data", 12, "latin1");
  if (bytes.toString("latin1", 0, 4) !== "RIFF" || data < 0) throw new Error(`${wav} is not a WAV file`);
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset + data + 8, Math.floor((bytes.length - data - 8) / 2));
  return { rate: bytes.readUInt32LE(24), channels: bytes.readUInt16LE(22), samples };
}

// How loud a stretch is, from 0 (silence) to 1 (full scale), as the root mean square of its samples.
export function loudness(s: Sound, fromMs: number, toMs: number): number {
  const at = (ms: number) => Math.min(s.samples.length, Math.max(0, Math.round((ms / 1000) * s.rate) * s.channels));
  const [from, to] = [at(fromMs), at(toMs)];
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i++) sum += (s.samples[i] / 32768) ** 2;
  return Math.sqrt(sum / (to - from));
}
