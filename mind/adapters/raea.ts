import { readFileSync } from "node:fs";
import { render } from "../../lessons/render.ts";
import { seconds } from "../cores/lesson.ts";
import type { Lessons } from "../ports.ts";

export type Look = { ink: string; accent: string; ground: string };

/**
 * The live lessons port: a short clip rendered by raea through lessons/render.ts, in the look's colours. The same
 * lesson asked for twice at once is rendered once. A clip already on disk comes back at once.
 */
export function raea(look: () => Look): Lessons {
  const making = new Map<string, ReturnType<Lessons["render"]>>();
  return {
    render(name, example, signal) {
      const data = { ...example, ...look() };
      const key = JSON.stringify([name, data]);
      const running = making.get(key);
      if (running) return running;
      const made = render(name, data, signal)
        .then(({ clip, still }) => {
          const length = seconds(readFileSync(clip));
          if (length === null) throw new Error(`the clip at ${clip} has no readable length`);
          return { clip, still, seconds: length };
        })
        .finally(() => making.delete(key));
      making.set(key, made);
      return made;
    },
  };
}
