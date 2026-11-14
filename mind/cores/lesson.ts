import { holdsResult, holdsValue } from "./push.ts";

export type Example = Record<string, string | string[]>;

const squash = (text: string) => text.replace(/\s+/g, "").toLowerCase();
const strings = (example: Example) => Object.values(example).flat();

/**
 * The first example a student may be shown: it is on other numbers than their own, so nothing of it is written on
 * their page, and it does not hold their result. With none left, there is no clip and the answer is words only.
 */
export function pick<T extends Example>(examples: T[], lines: string[], result: string | null): T | null {
  const page = lines.map(squash);
  for (const example of examples) {
    const parts = strings(example);
    const onThePage = parts.some((part) => /\d/.test(part) && squash(part).length >= 3 && page.some((line) => line.includes(squash(part))));
    const givesAway = result !== null && (holdsResult(parts.join(" ; "), result) || holdsValue(parts.join(" ; "), result, ""));
    if (!onThePage && !givesAway) return example;
  }
  return null;
}

/** How long an MP4 runs, in seconds, read from its movie header. Null when the bytes hold none. */
export function seconds(mp4: Uint8Array): number | null {
  const at = Buffer.from(mp4).indexOf("mvhd", 0, "latin1");
  if (at < 0) return null;
  const view = new DataView(mp4.buffer, mp4.byteOffset, mp4.byteLength);
  const body = at + 4;
  const wide = view.getUint8(body) === 1;
  const scaleAt = body + (wide ? 20 : 12);
  if (scaleAt + (wide ? 12 : 8) > mp4.byteLength) return null;
  const scale = view.getUint32(scaleAt);
  const length = wide ? Number(view.getBigUint64(scaleAt + 4)) : view.getUint32(scaleAt + 4);
  return scale > 0 && length > 0 ? length / scale : null;
}
