import { mock } from "node:test";
import { drafts } from "../../mind/drafts.ts";
import { settings } from "../../mind/settings.ts";

/** Lets everything that waits on a settled promise go on. Timers are stood in for here; this one is not. */
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));
type Case = { heard: [number, string][]; lines: Record<string, string | null>; takes: number | Record<string, number>; release: number; final: string };

/**
 * The dim line and the line then said, as the build is set, with the clock stood in for. In each case his words
 * arrive bit by bit (`heard`: ms from the press, and his words so far); the fast model writes the line given for
 * those words `takes` ms after it is asked (null: never); he lets go at `release`, the mind hears of it 300 ms
 * later, as it does behind the microphone's grace, and his final words are `final`. Gives the lines sent to be shown
 * dim, each with how many words its draft had heard and when it was sent, counted from the press; the one the app
 * shows, which is the newest sent by his release; and the quick line, null when none comes from the drafts and the
 * fixed line is said.
 */
export async function dimLine(input: { cases: Case[] }) {
  const out: unknown[] = [];
  for (const { heard, lines, takes, release, final } of input.cases) {
    mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 });
    const stop = new AbortController();
    try {
      const pressed = Date.now();
      const sent: { text: string; heard: number; at: number }[] = [];
      const opener: any = {
        open: (said: string) =>
          new Promise<string>((resolve) => {
            const line = lines[said];
            if (line != null) setTimeout(() => resolve(line), typeof takes === "number" ? takes : (takes[said] ?? 0));
          }),
      };
      const made = drafts(opener, settings, () => ["a line on his page"], { show: (thought) => sent.push({ ...thought, at: thought.at - pressed }), log() {} });
      made.reset();
      const to = async (at: number) => {
        for (let now = Date.now() - pressed; now < at; now++) {
          mock.timers.tick(1);
          await settled();
        }
      };
      for (const [at, words] of heard) {
        await to(at);
        made.note(words, stop.signal);
      }
      await to(release + 300);
      const quick = made.choose(final, stop.signal, pressed + release);
      const said = Promise.race([quick, new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))]);
      await to(release + 300 + 3001);
      out.push({ sent, shown: sent.filter((thought) => thought.at <= release).at(-1)?.text ?? null, quickLine: await said });
    } finally {
      stop.abort();
      mock.timers.reset();
    }
  }
  return out;
}
