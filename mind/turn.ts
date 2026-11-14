import { setTimeout as wait } from "node:timers/promises";
import { ask, type Screen } from "./ask.ts";
import { fits, hear, silence, type Words } from "./cores/catch.ts";
import { fitted } from "./cores/beats.ts";
import { circled, drew, echo, type Point } from "./cores/circle.ts";
import { showable } from "./cores/fit.ts";
import { empty, type Lesson } from "./cores/hold.ts";
import type { Listening, Opened, Ports } from "./ports.ts";
import type { Settings } from "./settings.ts";
import { speech } from "./speech.ts";
import { SEAM_VERSION, type FromBody, type FromMind } from "../seam/schema.ts";

type Send = (line: FromMind) => void;
type Log = (line: string) => void;

const v = SEAM_VERSION;
const why = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One connection's turns: the key, the ear and the picture come in, and each release starts one ask. */
export function turns(ports: Ports, settings: Settings, toBody: Send, log: Log) {
  let words: Words = silence;
  let lesson: Lesson = empty;
  let markUp = false;
  const send: Send = (line) => {
    if (line.type === "mark" || line.type === "board" || line.type === "clip") markUp = true;
    if (line.type === "clear") markUp = false;
    toBody(line);
  };
  let asks = 0;
  let screen: Screen | null = null;
  let screenCame: (() => void) | null = null;
  let running: AbortController | null = null;
  let listening: Listening | null = null;
  let trail: Point[] = [];
  /** What he drew around with no words waits here for his next ask. */
  let carried: Point[] = [];
  type Draft = { words: string; line: Promise<Opened>; at: number };
  /** The newest opener drafted from his words so far, and the newest one whose line is already written. */
  let drafted: Draft | null = null;
  let written: Draft | null = null;

  const openWith = (said: string, signal: AbortSignal) => {
    const line = ports.opener!.open(said, screen?.lines.map((read) => read.text) ?? [], signal);
    line.catch(() => {});
    return line;
  };

  function down(at: number) {
    running?.abort();
    const mine = new AbortController();
    running = mine;
    screen = null;
    drafted = null;
    written = null;
    trail = [];
    words = hear(silence, { type: "key.down", at });
    send({ v, type: "state", name: "listening" });
    // The voice connects while he talks, so its first words do not wait for a connection.
    ports.voice?.warm?.();
    try {
      listening = ports.ear.listen((text) => {
        if (mine.signal.aborted || words.final) return;
        words = hear(words, { type: "ear", text });
        send({ v, type: "heard", text: words.text, final: false });
        const due = drafted === null || Date.now() - drafted.at >= settings.openerDraftEveryMs.value;
        if (ports.opener && lesson.breakLine === null && due && words.text.split(" ").length >= settings.openerDraftWords.value) {
          const draft: Draft = { words: words.text, line: openWith(words.text, mine.signal), at: Date.now() };
          drafted = draft;
          draft.line.then(() => mine.signal.aborted || (written !== null && written.at > draft.at) || (written = draft)).catch(() => {});
        }
      }, mine.signal);
    } catch (error) {
      listening = null;
      send({ v, type: "state", name: "failed", detail: why(error) });
    }
  }

  async function up(at: number) {
    const mine = running;
    const ears = listening;
    listening = null;
    if (!mine || !ears || mine.signal.aborted) return;
    send({ v, type: "state", name: "thinking" });
    try {
      const text = await ears.finish();
      if (mine.signal.aborted) return;
      words = hear(hear(words, { type: "ear", text }), { type: "key.up", at });
      const drawn = drew(trail, settings.circleLeast.value);
      if (words.text === "") {
        if (!drawn) return send({ v, type: "state", name: "idle", detail: "no words heard" });
        carried = trail;
        const id = `t${++asks}`;
        const talk = speech({ ports, settings, send, log }, id, mine.signal);
        send({ v, type: "say", id, beat: 0, text: settings.circleNoWordsLine.value });
        talk.speak(0, settings.circleNoWordsLine.value);
        await talk.finished();
        if (!mine.signal.aborted) send({ v, type: "state", name: "idle" });
        return;
      }
      send({ v, type: "heard", text: words.text, final: true });
      const id = `t${++asks}`;
      const path = drawn ? trail : carried;
      carried = [];
      // His own loop comes back as a neat ring at once. It claims nothing about his work, so no model is asked.
      const lines = screen?.lines ?? [];
      const back = echo(path, screen, settings.circleLeast.value, (line) => fitted("ring", line.text, lines, settings.ringReach.value, screen?.display.scale ?? 1) === "box");
      if (back) send({ v, type: "echo", id, ...back });
      log(`heard "${words.text}" ${Date.now() - at} ms after the release`);
      if (screen === null) {
        await Promise.race([new Promise<void>((resolve) => (screenCame = resolve)), wait(settings.screenWaitMs.value, undefined, { signal: mine.signal })]);
        screenCame = null;
      }
      if (mine.signal.aborted) return;
      if (screen === null) return send({ v, type: "state", name: "failed", detail: "no picture of the screen arrived with this ask" });
      // A draft that is already written is used before a newer one still being written: it can be said at once.
      const pick = (draft: Draft | null) => (draft && fits(draft.words, words.text, settings.openerDraftShare.value) ? draft.line : null);
      // With a wrong line open, the opener is a fixed line: a model that sees his page could name the mistake a rung early.
      const opener =
        ports.opener === null
          ? null
          : lesson.breakLine !== null
            ? Promise.resolve({ line: settings.openerInLesson.value, seen: Promise.resolve(null) })
            : (pick(written) ?? pick(drafted) ?? openWith(words.text, mine.signal));
      const around = circled(path, screen.lines, screen.display, settings.circleLeast.value);
      const asking = { id, words: words.text, seen: screen, circled: around, lesson, markUp, releasedAt: at, opener, signal: mine.signal };
      await ask({ ports, settings, send, log }, asking, (kept) => (lesson = kept));
      if (!mine.signal.aborted) send({ v, type: "state", name: "idle" });
    } catch (error) {
      if (mine.signal.aborted) return;
      log(`this ask failed: ${why(error)}`);
      send({ v, type: "state", name: "failed", detail: showable(why(error)) ? why(error) : settings.lostAnswerLine.value });
    }
  }

  return {
    lesson: () => lesson,
    take(line: FromBody): void | Promise<void> {
      switch (line.type) {
        case "hello":
          return send({
            v,
            type: "ready",
            mind: "paral",
            holdKey: settings.holdKey.value,
            drawKey: settings.drawKey.value,
            earGraceMs: settings.earGraceMs.value,
            markPad: settings.markPad.value,
            pictureLongEdge: settings.pictureLongEdge.value,
          });
        case "key.down":
          return down(line.at);
        case "mic":
          return listening?.sound(Buffer.from(line.pcm, "base64"));
        case "screen":
          screen = line;
          return screenCame?.();
        case "key.up":
          return up(line.at);
        case "trail":
          return void trail.push({ x: line.x, y: line.y });
        case "close":
          running?.abort();
          listening = null;
          lesson = empty;
          carried = [];
          send({ v, type: "clear" });
          return send({ v, type: "state", name: "idle" });
      }
    },
  };
}
