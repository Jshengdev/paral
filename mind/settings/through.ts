import type { Setting } from "./types.ts";

/** Settings for working an exercise through, step by step, on a measured drawing: a switch that is off unless turned on. */
export const through = {
  workThrough: {
    value: process.env.PARAL_WORK_THROUGH === "1",
    why: "The switch for working an exercise through on his own screen, one step of its working each time he asks for it in so many words (`workThroughAsks`), with rings on the drawing and a board of the steps so far. It goes against the promise that on his own work paral gives one hint at a time and never the answer, so it is off unless turned on, and when on it acts only on those words and only when a measured sheet is on his screen; every other ask, and a plain ask for the answer, still goes up the hint ladder. Turned on for one run with no code changed by setting PARAL_WORK_THROUGH=1 for the mind (`PARAL_WORK_THROUGH=1 ./run`, or the same before `./flow`); any other value, or none, leaves it off. The owner asked for it on November 15 for the chemistry worksheet.",
    measured: "off by default. On, four scripted live runs on the worksheet's picture on November 15 (notes/2026-11-15.md): two walks gave five steps in order and then the done line, a third gave two steps between plain asks that were hinted, and a run with it off gave hints only; never on his real screen",
  } satisfies Setting<boolean>,

  workThroughAsks: {
    value: ["walk me through", "work it through", "work through it", "show me each step", "what happens next", "then what"],
    why: "Words that ask for the next step of the working, anywhere in what he says (`asksFor`: a phrase from the start of a word). Each gives exactly one step, the first ask the first step. With the switch off they are an ordinary ask. None of them is one of the \"show me\" walk's whole words (`showMeAsks`: \"what's next\", \"next step\"), so neither walk takes the other's words.",
    measured: "not measured; a first list, chosen by the builder. In four live runs on the worksheet's picture \"walk me through it\" and \"what happens next\" were each taken as a step, and \"so, what is the final product?\" and \"just tell me the answer\" were not",
  } satisfies Setting<string[]>,

  workThroughSpotsMost: {
    value: 3,
    why: "At most this many places of the drawing are ringed for one step of the working, against two for a hint (`spotsMost`): a step of a mechanism is often about three atoms at once (the oxygen that attacks, the carbon it attacks and the oxygen the electrons go to), and inside a walk he asked for the steps are what is given; only the product is kept to the last step.",
    measured: "not measured",
  } satisfies Setting<number>,

  workThroughDoneLine: {
    value: "That was the last step: the working is all on your screen.",
    why: "Said, with no model asked, when he asks for another step after the step that said what the working gives. Nothing on his screen changes.",
    measured: "not measured",
  } satisfies Setting<string>,

  workThroughHeldLine: {
    value: "That step said too much at once. Ask me for it again.",
    why: "Said in place of a step that gave the result away before the working had reached it: the step is not added to the board and nothing is ringed, so the next ask asks for the same step again.",
    measured: "not measured",
  } satisfies Setting<string>,
};
