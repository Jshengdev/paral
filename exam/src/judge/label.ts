import type { Placed } from "../session.ts";
import type { Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";

// C28: a small label beside the open capsule names the key to hold. His click of 2026-11-15, 18:47, from the
// reference's video cut at five frames a second:
//   21:48.8          for a moment after he lets go, a small label under the capsule reads "Working on it"
//   21:49.0, 02:09.4, 12:48.2   while the capsule shows the tutor's own words, it reads "Hold fn to talk"
//   02:08.6, 11:46.4, 12:49.8   the circle alone carries no label
//   11:48.4 to 11:50, 21:48.4   while he talks it does not tell him to hold the key
// Ours can listen on one of six keys, and the run's own record says which (the `ready` line's holdKey). The label
// must name that key: a fixed line would pass a label that lies on any other key. A Mac has two Option keys, so
// for the right one the label says right.
//
// The label's words and its place are the film's to say; the seam carries neither. The film's record lists the label
// (`what: "label"`, with what it `says`) each time its words or its place change, and with null when it goes.

const KEY_NAMED: Record<string, RegExp> = {
  rightOption: /\bright\b.*(\boption\b|⌥)/i,
  fn: /\bfn\b|\bglobe\b/i,
  controlOption: /(\bcontrol\b|\bctrl\b|⌃).*(\boption\b|⌥)/i,
  shift: /\bshift\b|⇧/i,
  control: /\bcontrol\b|\bctrl\b|⌃/i,
  command: /\bcommand\b|\bcmd\b|⌘/i,
};
const TELLS_HIM_TO_HOLD = /\bhold\b/i;
const SAYS_WORKING = /\b(working|on it)\b/i;
// The film is thirty frames a second. A label drawn with the look it belongs to is in the record within three frames.
const SETTLE_MS = 100;
// The reference's label is about a quarter of its capsule's height (02:09). Half is the most that still reads as small.
const SMALL = 0.5;

const inForce = (rows: Placed[], at: number) => rows.filter((p) => p.at <= at).at(-1);
/**
 * When to read the label that belongs to a look: three frames after the look began, or the capsule's last frame in
 * that look if it changed sooner. (He let go and pressed again a tenth of a second later: the label said it was
 * working for those three frames and went with his press, and reading it after them called it missing.)
 */
function settled(capsule: Placed[], look: Placed): number {
  const next = capsule.find((p) => p.at > look.at && p.look !== look.look);
  return Math.min(look.at + SETTLE_MS, next ? next.at - 1 : Infinity);
}
const words = (label: Placed | undefined) => (label?.says ?? "").trim();
const shows = (label: Placed | undefined) => (words(label) === "" ? "no label" : `"${words(label)}"`);

/** The label sits close beside the capsule, is smaller than it, and is not over it. */
function placedWell(label: Placed, capsule: Placed): string | null {
  const a = label.box, b = capsule.box;
  const apartX = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const apartY = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  if (apartX === 0 && apartY === 0) return "it lies over the capsule";
  if (Math.hypot(apartX, apartY) > b.h) return `it is ${Math.round(Math.hypot(apartX, apartY))} pt from the capsule, more than the capsule's own height`;
  const centre = a.x + a.w / 2;
  if (centre < b.x || centre > b.x + b.w) return "it is off to one side of the capsule";
  if (a.h > b.h * SMALL) return `it is ${Math.round(a.h)} pt tall beside a capsule of ${Math.round(b.h)} pt`;
  return null;
}

/** C28, for one ask he made with the key. `until` is where this ask's stretch of the film ends; `key` is the key the run listens on. */
export function keyLabel(ask: Ask, placed: Placed[], until: number, key: string | null): Verdict[] {
  const s = ask.index;
  const capsule = placed.filter((p) => p.what === "capsule");
  const labels = placed.filter((p) => p.what === "label");
  if (capsule.length === 0 || ask.up === null) return [];
  const from = s === 0 ? 0 : ask.down;
  const inStretch = (p: Placed) => p.at >= from && p.at < until;
  const out: Verdict[] = [];

  const working = "For a moment after he lets go, a small label says it is working";
  const thinking = capsule.find((p) => p.look === "thinking" && p.at >= ask.up! && p.at < until);
  if (!thinking) out.push(unseen("C28", s, working, "the film shows no thinking look after this release"));
  else {
    const label = inForce(labels, settled(capsule, thinking));
    out.push(SAYS_WORKING.test(words(label)) ? yes("C28", s, working, shows(label)) : no("C28", s, working, shows(label)));
  }

  const speaking = capsule.find((p) => p.look === "speaking" && p.at >= ask.up! && p.at < until);
  if (speaking) {
    const names = "While its own words show, the label names the key to hold";
    const label = inForce(labels, settled(capsule, speaking));
    const pattern = key === null ? undefined : KEY_NAMED[key];
    const named = pattern !== undefined && TELLS_HIM_TO_HOLD.test(words(label)) && pattern.test(words(label));
    const measured = `${shows(label)}, on a run that listens on ${key ?? "a key the record does not name"}`;
    out.push(pattern === undefined ? unseen("C28", s, names, measured) : named ? yes("C28", s, names, measured) : no("C28", s, names, measured));
    const beside = "The label sits close beside the capsule, smaller than it, and not over it";
    const fault = named ? placedWell(label!, inForce(capsule, settled(capsule, speaking))!) : null;
    out.push(!named ? unseen("C28", s, beside, "no label names the key, so there is none to place") : fault === null ? yes("C28", s, beside, `${Math.round(label!.box.h)} pt tall`) : no("C28", s, beside, fault));
  }
  if (labels.length === 0) return out;

  // While he holds the key, whatever label stood before has had three frames to go.
  const held = [inForce(labels, ask.down + SETTLE_MS), ...labels.filter((p) => p.at > ask.down + SETTLE_MS && p.at < ask.up!)].find((p) => TELLS_HIM_TO_HOLD.test(words(p)));
  const holding = "While he holds the key, the label does not tell him to hold it";
  const when = held && held.at <= ask.down ? "still up three frames into his press" : `${Math.round((held?.at ?? 0) - ask.down)} ms after his press`;
  out.push(held ? no("C28", s, holding, `${shows(held)} ${when}`) : yes("C28", s, holding, "no such label between press and release"));

  const alone = capsule.filter((p) => p.look === "rest" && inStretch(p)).find((p) => words(inForce(labels, p.at + SETTLE_MS)) !== "");
  const rest = "The circle alone carries no label";
  out.push(alone ? no("C28", s, rest, `${shows(inForce(labels, alone.at + SETTLE_MS))} at rest`) : yes("C28", s, rest, "no label beside the resting circle"));
  return out;
}
