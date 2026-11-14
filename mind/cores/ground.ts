export type Box = { x: number; y: number; w: number; h: number };
export type ReadLine = { text: string; box: Box };
export type Display = { scale: number; x: number; y: number };

export type Found =
  | { found: true; box: Box; line: string; score: number }
  | { found: false; best: number };

const plain = (text: string) => text.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function pairs(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const joined = plain(text).replace(/ /g, "");
  for (let i = 0; i < joined.length - 1; i++) {
    const pair = joined.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

export function alike(a: string, b: string): number {
  const left = plain(a);
  const right = plain(b);
  if (left === "" || right === "") return 0;
  if (left === right) return 1;
  const first = pairs(a);
  const second = pairs(b);
  let shared = 0;
  let total = 0;
  for (const [pair, count] of first) {
    shared += Math.min(count, second.get(pair) ?? 0);
    total += count;
  }
  for (const count of second.values()) total += count;
  return total === 0 ? 0 : (2 * shared) / total;
}

const squeeze = (text: string) => text.replace(/\s+/g, " ").trim();

export function sameness(a: string, b: string): number {
  const left = squeeze(a);
  const right = squeeze(b);
  const longest = Math.max(left.length, right.length);
  if (longest === 0) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      const swap = previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, swap);
    }
    previous = current;
  }
  return 1 - previous[right.length] / longest;
}

export function toPoints(box: Box, display: Display): Box {
  return {
    x: display.x + box.x / display.scale,
    y: display.y + box.y / display.scale,
    w: box.w / display.scale,
    h: box.h / display.scale,
  };
}

export function locate(quoted: string, lines: ReadLine[], display: Display, minScore: number, index: number | null = null): Found {
  const pointed = index !== null ? lines[index] : undefined;
  if (pointed !== undefined) {
    const score = alike(quoted, pointed.text);
    if (score >= minScore) return { found: true, box: toPoints(pointed.box, display), line: pointed.text, score };
  }
  let best: ReadLine | null = null;
  let bestScore = 0;
  for (const line of lines) {
    const score = alike(quoted, line.text);
    if (score > bestScore) {
      best = line;
      bestScore = score;
    }
  }
  if (best === null || bestScore < minScore) return { found: false, best: bestScore };
  return { found: true, box: toPoints(best.box, display), line: best.text, score: bestScore };
}
