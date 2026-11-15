import type { Setting } from "./types.ts";

/** Settings for the socket, the keys, and what crosses between the body and the mind. */
export const wire = {
  socketPath: {
    value: "/tmp/paral.sock",
    why: "One local socket between body and mind; a path under /tmp needs no setup and is gone on restart.",
    measured: "not measured",
  } satisfies Setting<string>,

  holdKey: {
    value: "rightOption",
    why: "The key that starts and ends a turn: rightOption, fn, or controlOption (both held). The body reads it by asking the system for the keys' state, with no event tap. fn is the wanted key, but a dictation app may already hold fn on his Mac, so the default is the right Option key until fn is tried there.",
    measured: "not measured; the key has never been pressed against a running body",
  } satisfies Setting<"rightOption" | "fn" | "controlOption">,

  drawKey: {
    value: "shift",
    why: "Held together with the hold key, it turns the pointer into a pen: a trail follows it, the path is drawn on the picture the model gets, and the lines it went around are named to the model. Shift types nothing while the hold key is down.",
    measured: "not measured; never pressed against a running body",
  } satisfies Setting<"shift" | "control" | "command">,

  earGraceMs: {
    value: 300,
    why: "After the key is released the body keeps sending the microphone's sound this long, so the tail of the sentence is kept. The key-up line still carries the true moment of release.",
    measured: "not measured here; another open project waits 0.3 s, per a read of its source",
  } satisfies Setting<number>,

  screenWaitMs: {
    value: 2000,
    why: "The picture of the screen may arrive after the key-up. The mind waits this long for it and then fails loudly, so the picture never holds the words up for longer.",
    measured: "not measured",
  } satisfies Setting<number>,

  stopLimitMs: {
    value: 1000,
    why: "When the mind is told to stop it ends its open connections and exits inside this limit, so a linked body cannot keep it alive.",
    measured: "not measured",
  } satisfies Setting<number>,

  pictureLongEdge: {
    value: 1280,
    why: "The picture sent to the brain is scaled so its longer side is at most this many pixels, to keep the request small. The words are still read from the full picture on the Mac.",
    measured: "same real ask, two runs each: at 1280 the first field came at 2.6 to 2.8 s and an ask cost about $0.022; at 2000 it came at 2.7 to 2.9 s and cost about $0.030. No speed difference seen, about a quarter cheaper (2026-11-14)",
  } satisfies Setting<number>,

  cropAround: {
    value: { share: 1, points: 200 },
    why: "When he draws around something, the answer is made from only that part of the picture, and the words of the lines in it: the loop, and room on every side of this share of the loop's own size or this many points, whichever is more. The deep model gets nothing else. This does not keep the rest of the page on the Mac: the picture taken as the key goes down is of the whole display, and the fast model drafts the quick line from its read lines while he is still drawing. The room is there so the lines around what he circled, such as the problem above his working, still reach the deep model.",
    measured: "not measured on real pages; on the exam's pages the lines of one problem sit within 200 points of each other",
  } satisfies Setting<{ share: number; points: number }>,

  markPad: {
    value: 4,
    why: "Points of air between the read line and the highlight drawn round it, so the ring does not sit on the letters.",
    measured: "not measured; set by eye, on a dial later",
  } satisfies Setting<number>,
};
