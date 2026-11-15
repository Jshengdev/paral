// Runners for rows about the demo's centre in the menu bar's menu: the menu as plain values (`Sitting`, in the
// body), drawn from a bank of scenarios, after each press and failure. Read through paral-headless; no menu, no window.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tape } from "../../mind/adapters/tape.ts";
import { ready } from "../../mind/ready.ts";
import { settings } from "../../mind/settings.ts";
import { FromMind, read, write } from "../../seam/schema.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
type Item = { title: string; ticked: boolean; enabled: boolean; does: string; tip: string; under: Item[] };
type Menu = { scenarios: Item[]; startOver: Item; failure: Item | null };

/** One item as one line: ticked or not, greyed out or not, its words, and what a press does. */
const line = (item: Item) => `${item.ticked ? "[x] " : ""}${item.enabled ? "" : "(greyed) "}${item.title} -> ${item.does}${item.tip && !item.title.endsWith(item.tip) ? ` (tip: ${item.tip})` : ""}`;
/** The menu from the top, as he sees it: each scenario with its submenu indented under it, then "Start over", then the failure. */
const lines = (menu: Menu) => [
  ...menu.scenarios.flatMap((scenario) => [`${scenario.ticked ? "[x] " : ""}${scenario.title} >`, ...scenario.under.map((item) => `    ${line(item)}`)]),
  line(menu.startOver),
  ...(menu.failure ? [line(menu.failure)] : []),
];
const drawn = (input: object) => (JSON.parse(execFileSync(headless, ["centre"], { input: JSON.stringify(input), encoding: "utf8" })) as { did: string; menu: Menu }[]).map(({ did, menu }) => ({ did, menu: lines(menu) }));

/** The menu before any event, then what each event did and the menu after it. A press names its item by titles, from the top. */
export function centre(input: { cues: object[]; events: object[] }) {
  return drawn(input);
}

/** The real bank (`cueCards`) as it crosses the seam in the ready line and as the app's menu draws it, before any press. */
export function bank() {
  const line = JSON.parse(write(FromMind, ready(tape(join(root, "test", "tapes", "algebra.json")), settings)));
  const back = read(FromMind, JSON.stringify(line));
  return { crossesTheSeam: back.ok, pages: (line.cues ?? []).map((cue: { name: string; page?: string }) => `${cue.name}: ${cue.page ?? "no page"}`), menu: drawn({ ready: line, events: [] })[0].menu };
}
