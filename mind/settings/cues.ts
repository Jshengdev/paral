import type { Setting } from "./types.ts";

/** Settings for the lines he can tap instead of saying. */
export const cues = {
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
