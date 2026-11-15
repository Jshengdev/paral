// The runner for rows about how long a line stands before the next takes its place: what the capsule and the
// guide's card say at given moments of a hand-written run, through the real scene. No mind, no service, no window.
import { handWritten, type Written } from "./body.ts";
import { at } from "./placed.ts";

/**
 * At each moment: the words the capsule holds (nothing unless it is speaking), the words on the guide's card, and the
 * words on the nudge card, which is where a line said without being asked comes up.
 * A row writes a voice line by its length (`ms`); here it becomes that much silence at the voice's 24 kHz.
 */
export function stands(input: { rows: Written[]; at: number[] }) {
  const rows = input.rows.map((row) => {
    if (row.line.type !== "voice" || typeof row.line.ms !== "number") return row;
    const { ms, ...line } = row.line;
    return { at: row.at, line: { ...line, pcm: Buffer.alloc(ms * 48).toString("base64") } };
  });
  return at(handWritten("stands", rows), input.at).map(({ capsule, guide, nudge }) => ({ pill: capsule.look === "speaking" ? capsule.says : null, card: guide?.text ?? null, nudge: nudge?.text ?? null }));
}
