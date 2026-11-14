import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { run } from "./tools.ts";

export const FRAMES_PER_SECOND = 30;

export const frameAt = (ms: number) => Math.max(1, Math.round((ms / 1000) * FRAMES_PER_SECOND) + 1);
export const framePath = (dir: string, frame: number) => join(dir, "frames", `f_${String(frame).padStart(5, "0")}.png`);

export async function frameCount(dir: string): Promise<number> {
  return (await readdir(join(dir, "frames"))).filter((name) => /^f_\d{5}\.png$/.test(name)).length;
}

// The run as one film a person can watch: the frames with the voice under them.
export async function film(dir: string, hasVoice: boolean): Promise<string> {
  const out = join(dir, "run.mp4");
  const voice = hasVoice ? ["-i", join(dir, "voice.wav")] : [];
  // Frame 0 is the bare page, so the film starts at frame 1. The picture is padded to even sides, which the codec needs.
  await run("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(FRAMES_PER_SECOND), "-start_number", "1", "-i", join(dir, "frames", "f_%05d.png"), ...voice,
    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", ...(hasVoice ? ["-c:a", "aac"] : []), "-movflags", "+faststart", out], 600_000);
  return out;
}

// One still per moment, for the explainer and for a person judging by eye.
export async function still(dir: string, frame: number, name: string, width = 1296): Promise<string> {
  const out = join(dir, `${name}.jpg`);
  await run("ffmpeg", ["-loglevel", "error", "-y", "-i", framePath(dir, frame), "-vf", `scale=${width}:-1`, "-q:v", "4", out]);
  return out;
}

// Twelve frames on one sheet, `everyMs` apart from `fromMs`: how a person judges a stretch of the film frame by frame.
export async function sheet(dir: string, fromMs: number, everyMs: number, name: string): Promise<string> {
  const out = join(dir, `${name}.jpg`);
  const step = Math.max(1, Math.round((everyMs / 1000) * FRAMES_PER_SECOND));
  await run("ffmpeg", ["-loglevel", "error", "-y", "-start_number", String(frameAt(fromMs)), "-i", join(dir, "frames", "f_%05d.png"),
    "-vf", `select=not(mod(n\\,${step})),scale=576:-1,tile=3x4`, "-frames:v", "1", "-q:v", "4", out]);
  return out;
}
