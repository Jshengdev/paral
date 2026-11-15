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
        { text: "Press Add to calendar on the card, or say: add it to my calendar", when: "kept" },
        { text: "Hold the right Option key and ask: do we need five officers and an advisor? There's only three of us", when: "asked officers" },
        { text: "Hold the key and say: show me", when: "showme" },
        { text: "Click the boxed line, or say it again: show me", when: "showme again" },
        { text: "Ask: what else do we have to finish by November 22?", when: "asked what else" },
        { text: "Ask: can you help me find where to book this event?", when: "asked book" },
      ],
      "catalina-island-maymester": [
        { text: "Wait: it looks at this page by itself", when: "look" },
        { text: "Hold the right Option key and ask: is it too late to apply?", when: "asked too late" },
        { text: "Ask: when does it open again?", when: "asked open again" },
      ],
    } as Record<string, Step[]>,
    why: "The demo's guide: for a kept page, by its name, what to do next, in the order of the demo, each with what the mind must see happen for it to count (see cores/guide.ts). The body shows the first step not yet done as a small card. A page with no list shows no card; an empty object turns the guide off. The club page's steps follow the take (takes/scenario.md in the event's folder): the calendar and the officers' ask come before the walk, since those are the five a first-time student ran cleanly. The first ask of a page names the key, which that student could not tell from \"the key\".",
    measured: "not seen on a Mac; the club page's steps are the take's own, in its order of 02:49 on November 15. The key is named as the right Option key, which is what holdKey is set to; the two are not tied together",
  } satisfies Setting<Record<string, Step[]>>,

  openingLine: {
    value: "I sit on top of the page you have open. When a USC page hides something that will cost you later, I box it, and I can keep the date for you.",
    why: "Shown once in the capsule when the app starts, so a student who has just opened it knows what it is. It goes to the body in the ready line; the app shows it, not spoken, and a scripted run does not show it. An empty line shows nothing.",
    measured: "not seen on a Mac",
  } satisfies Setting<string>,

  demoDoneLine: {
    value: "That is every step for this page.",
    why: "Shown once in the guide's card when every step of the page on screen has been seen to happen.",
    measured: "not seen on a Mac",
  } satisfies Setting<string>,

  cueCards: {
    value: [
      { name: "Club recognition page", lines: ["add it to my calendar", "do we need five officers and an advisor? there's only three of us", "show me", "what else do we have to finish by November 22?", "what is still ahead?", "can you help me find where to book this event?"] },
      { name: "Chemistry worksheet", lines: ["what does this formula tell me?", "can you draw how these steps connect?", "what happens first?", "so, what is the final product?", "just tell me the answer"] },
      { name: "Maymester page", lines: ["is it too late to apply?", "when does it open again?"] },
    ],
    why: "Lines he can tap in the menu bar's menu instead of saying them, for a hall too loud for the microphone: the asks of the three demo pages, in the order of the demo. A tapped line is asked exactly as a spoken one, with the same picture of the screen and no ear. An empty list shows no cards.",
    measured: "not tapped on a Mac yet; one live run through the scripted stand-in",
  } satisfies Setting<{ name: string; lines: string[] }[]>,
};
