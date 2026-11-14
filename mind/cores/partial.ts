export type Part = {
  problem?: string;
  breakIndex?: number | null;
  breakLine?: string | null;
  result?: string | null;
  lesson?: string | null;
  board?: unknown;
  /** The sentences that are finished. */
  beats: unknown[];
  /** The sentence being written, with only the fields of it that are finished (its mark comes before its words). */
  next?: unknown;
  whole: boolean;
};

/**
 * What can be trusted of a JSON reply that is still arriving. The text is cut back to its last comma outside a string,
 * and a field is kept only once its own value has closed, so every value kept is finished. A sentence counts as
 * finished once its own object has closed; the one still being written is given apart, as `next`. The fields may
 * come in any order.
 */
export function settled(text: string): Part | null {
  try {
    const whole = JSON.parse(text);
    return { ...whole, beats: Array.isArray(whole.beats) ? whole.beats : [], whole: true };
  } catch {
    // still arriving
  }
  const open: string[] = [];
  let inString = false;
  let escaped = false;
  let began = 0;
  let lastString = "";
  /** How deep the list of beats sits while it is open, else -1. */
  let beatsAt = -1;
  /** The top-level field whose value is being written. */
  let field = "";
  let cut = -1;
  let closers = "";
  let atCut = { depth: 0, beatsAt: -1, field: "" };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') {
        inString = false;
        lastString = text.slice(began + 1, i);
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      began = i;
    } else if (c === "{") open.push("}");
    else if (c === "[") {
      open.push("]");
      if (open.length === 2 && lastString === "beats") beatsAt = 2;
    } else if (c === "}" || c === "]") {
      if (c === "]" && open.length === beatsAt) beatsAt = -1;
      open.pop();
    } else if (c === ":" && open.length === 1) field = lastString;
    else if (c === ",") {
      cut = i;
      closers = [...open].reverse().join("");
      atCut = { depth: open.length, beatsAt, field };
    }
  }
  if (cut < 0) return null;
  try {
    const part = JSON.parse(text.slice(0, cut) + closers);
    if (typeof part !== "object" || part === null) return null;
    // A cut inside a field's own value (a board with one row of two written) leaves that field unfinished: it is left out.
    if (atCut.depth > 1 && atCut.field !== "beats") delete part[atCut.field];
    const beats: unknown[] = Array.isArray(part.beats) ? part.beats : [];
    // Inside a beat's own object at the cut, the last beat is the one still being written.
    const writing = atCut.beatsAt !== -1 && atCut.depth > atCut.beatsAt;
    return { ...part, beats: writing ? beats.slice(0, -1) : beats, ...(writing ? { next: beats.at(-1) } : {}), whole: false };
  } catch {
    return null;
  }
}
