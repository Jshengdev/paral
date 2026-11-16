import { mock } from "node:test";
import { fast } from "../../mind/fast.ts";
import { settings } from "../../mind/settings.ts";

const MODEL_LINE = "Let's look through your plan.";
/** Lets everything that waits on a settled promise go on. Timers are stood in for here; this one is not. */
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * The quick line against the clock, as the build is set, with the clock stood in for. In each case his final words
 * reach the mind `heard` ms after the release, which is when the quick line is asked for, and the fast model's line
 * is written `written` ms after the release (null: never). Gives what he hears first and when, counted from the
 * release, whether that is the model's own line, and the line the deep model would be told.
 */
export async function quickDeadline(input: { cases: { heard: number; written: number | null }[] }) {
  const out: unknown[] = [];
  for (const { heard, written } of input.cases) {
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"], now: 1_000_000 });
    const stop = new AbortController();
    try {
      const releasedAt = Date.now();
      const said: { text: string; at: number }[] = [];
      const opener = new Promise<string>((resolve) => {
        if (written !== null) setTimeout(() => resolve(MODEL_LINE), written);
      });
      mock.timers.tick(heard);
      await settled();
      const hands: any = { settings, send: (line: any) => line.type === "say" && said.push({ text: line.text, at: Date.now() - releasedAt }), log: () => {} };
      const asking: any = { id: "t1", releasedAt, opener, signal: stop.signal };
      // Nothing is ever heard to end here, so no stall line is said: only the quick line is in question.
      const lines = fast(hands, asking, { speak() {}, quietAt: () => null }, { nothingSaid: () => true, arriving: () => false, shown: () => false });
      await settled();
      for (let at = heard; at < 2000; at += 1) {
        mock.timers.tick(1);
        await settled();
      }
      const told = await lines.opened;
      out.push({ heard, written, first: said[0] ?? null, own: said[0]?.text === MODEL_LINE, toldTheDeepModel: told, modelLineEverSaid: said.some((line) => line.text === MODEL_LINE) });
    } finally {
      stop.abort();
      mock.timers.reset();
    }
  }
  return out;
}
