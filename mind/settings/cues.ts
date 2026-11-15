import type { Step } from "../cores/guide.ts";
import type { Setting } from "./types.ts";

/** Settings for the demo: the lines he can tap instead of saying, and the guide that says what to do next. */
export const cues = {
  demoSteps: {
    value: {
      "rso-recognition-process": [
        { text: "Wait: it looks at this page by itself", when: "look" },
        { text: "Scroll until Deadlines is on screen", when: "heading" },
        { text: "Open Deadlines", when: "line" },
        { text: "Hold the key and say: show me", when: "showme" },
        { text: "Say it again: show me", when: "showme again" },
        { text: "Say: add it to my calendar", when: "kept" },
        { text: "Say: what else do I need before then?", when: "asked what else" },
        { text: "Say: can you help me find where to book this event?", when: "asked book" },
      ],
      "catalina-island-maymester": [
        { text: "Wait: it looks at this page by itself", when: "look" },
        { text: "Say: is it too late to apply?", when: "asked too late" },
        { text: "Say: when does it open again?", when: "asked open again" },
      ],
    } as Record<string, Step[]>,
    why: "The demo's guide: for a kept page, by its name, what to do next, in the order of the demo, each with what the mind must see happen for it to count (see cores/guide.ts). The body shows the first step not yet done as a small card. A page with no list shows no card; an empty object turns the guide off.",
    measured: "not seen on a Mac; the club page's steps are the take's own",
  } satisfies Setting<Record<string, Step[]>>,

  demoDoneLine: {
    value: "That is every step for this page.",
    why: "Shown once in the guide's card when every step of the page on screen has been seen to happen.",
    measured: "not seen on a Mac",
  } satisfies Setting<string>,

  cueCards: {
    value: [
      { name: "Club recognition page", lines: ["add it to my calendar", "what else do I need before then?", "what is still ahead?", "can you help me find where to book this event?", "show me"] },
      { name: "Chemistry worksheet", lines: ["what does this formula tell me?", "can you draw how these steps connect?", "what happens first?", "so, what is the final product?", "just tell me the answer"] },
      { name: "Maymester page", lines: ["is it too late to apply?", "when does it open again?"] },
    ],
    why: "Lines he can tap in the menu bar's menu instead of saying them, for a hall too loud for the microphone: the asks of the three demo pages, in the order of the demo. A tapped line is asked exactly as a spoken one, with the same picture of the screen and no ear. An empty list shows no cards.",
    measured: "not tapped on a Mac yet; one live run through the scripted stand-in",
  } satisfies Setting<{ name: string; lines: string[] }[]>,
};
