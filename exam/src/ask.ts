import { rm, stat } from "node:fs/promises";
import { run } from "./tools.ts";

const RATE = 16_000;
const HEADER_BYTES = 44;

// A scripted ask as sound, made on this Mac: the system voice reads the words, then the file becomes 16 kHz mono.
export async function speak(words: string, wav: string): Promise<number> {
  const spoken = `${wav}.aiff`;
  await run("say", ["-o", spoken, words]);
  await run("afconvert", ["-f", "WAVE", "-d", `LEI16@${RATE}`, "-c", "1", spoken, wav]);
  await rm(spoken);
  return lengthMs(wav);
}

export async function silence(ms: number, wav: string): Promise<number> {
  await run("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `anullsrc=r=${RATE}:cl=mono`, "-t", String(ms / 1000), "-c:a", "pcm_s16le", wav]);
  return lengthMs(wav);
}

async function lengthMs(wav: string): Promise<number> {
  const bytes = (await stat(wav)).size - HEADER_BYTES;
  return Math.round((bytes / 2 / RATE) * 1000);
}
