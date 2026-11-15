import { setTimeout as wait } from "node:timers/promises";
import { ask, type Screen } from "./ask.ts";
import { hear, silence, type Words } from "./cores/catch.ts";
import { fitted } from "./cores/beats.ts";
import { circled, drew, echo, type Point } from "./cores/circle.ts";
import { showable } from "./cores/fit.ts";
import { empty, type Lesson } from "./cores/hold.ts";
import { whichPage } from "./cores/page.ts";
import { glances, type Ahead, type Asked } from "./glance.ts";
import { keeps } from "./keep.ts";
import { drafts } from "./drafts.ts";
import type { Listening, Ports } from "./ports.ts";
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
  /** What is still ahead for him, as found on the kept pages he has been on. It lasts for the connection. */
  let ahead: Ahead[] = [];
  /** How many releases are still being answered. A look he did not ask for waits while he holds the key or an answer is on its way. */
  let answering = 0;
  /** His last ask and what he was told, for a look at the page he goes to next. */
  let asked: (Asked & { at: number }) | null = null;
  /** The date paral last showed him, for "add it to my calendar". */
  const keeping = keeps({ ports, settings, send, log });
  const glancing = glances({ ports, settings, send, log }, (found) => (ahead = [...ahead.filter((old) => !found.some((step) => step.step === old.step)), ...found]), keeping.found);
  /** The opener, drafted from his words while he is still talking. With no fast model there is no opener at all. */
  const drafting = ports.opener && drafts(ports.opener, settings, () => screen?.lines.map((read) => read.text).filter(Boolean) ?? []);

  /** The quick line of this ask: none with no fast model, a fixed line while a wrong line is open, otherwise the drafted one. */
  function opening(signal: AbortSignal): Promise<string> | null {
    if (!drafting) return null;
    // With a wrong line open a model that sees his page could name the mistake a rung early, so the line is fixed.
    if (lesson.breakLine !== null) return Promise.resolve(settings.openerInLesson.value);
    return drafting.choose(words.text, signal);
  }

  function down(at: number) {
    running?.abort();
    glancing.stop();
    const mine = new AbortController();
    running = mine;
    screen = null;
    drafting?.reset();
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
        // With a wrong line open the opener is a fixed line (see up), so nothing is drafted.
        if (lesson.breakLine === null) drafting?.note(words.text, mine.signal);
      }, mine.signal);
    } catch (error) {
      listening = null;
      send({ v, type: "state", name: "failed", detail: why(error) });
    }
  }

  async function up(at: number) {
    answering++;
    try {
      await released(at);
    } finally {
      answering--;
    }
  }

  async function released(at: number) {
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
        if (!drawn) {
          log(`no words were heard in this hold, ${Date.now() - at} ms after the release; nothing is asked`);
          return send({ v, type: "state", name: "idle", detail: "no words heard" });
        }
        carried = trail;
        const id = `t${++asks}`;
        log(`${id}: he drew a path of ${trail.length} points and said nothing; it waits for his next ask`);
        const talk = speech({ ports, settings, send, log }, id, mine.signal);
        send({ v, type: "say", id, beat: 0, text: settings.circleNoWordsLine.value });
        talk.speak(0, settings.circleNoWordsLine.value);
        await talk.finished();
        if (!mine.signal.aborted) send({ v, type: "state", name: "idle" });
        return;
      }
      send({ v, type: "heard", text: words.text, final: true });
      const id = `t${++asks}`;
      if (await keeping.asked(id, words.text, at, mine.signal)) return;
      const path = drawn ? trail : carried;
      carried = [];
      // His own loop comes back as a neat ring at once. It claims nothing about his work, so no model is asked.
      const lines = screen?.lines ?? [];
      const back = echo(path, screen, settings.circleLeast.value, (line) => fitted("ring", line.text, lines, settings.ringReach.value, screen?.display.scale ?? 1) === "box");
      if (back) send({ v, type: "echo", id, ...back });
      log(`heard "${words.text}" ${Date.now() - at} ms after the release`);
      // What became of his path is said here: nothing else in the log tells whether a circle registered.
      const least = settings.circleLeast.value;
      if (trail.length > 0 && !drawn) log(`${id}: a path of ${trail.length} point${trail.length === 1 ? "" : "s"} came with the draw key, too few or too small to be a circle (it takes ${least.points} points and ${least.side} points across); it is not used`);
      if (screen === null) {
        await Promise.race([new Promise<void>((resolve) => (screenCame = resolve)), wait(settings.screenWaitMs.value, undefined, { signal: mine.signal })]);
        screenCame = null;
      }
      if (mine.signal.aborted) return;
      if (screen === null) {
        log(`no picture of the screen arrived within ${settings.screenWaitMs.value} ms of his words; this ask fails and nothing is asked (the body says why in the capsule: the screen grant, most likely)`);
        return send({ v, type: "state", name: "failed", detail: "no picture of the screen arrived with this ask" });
      }
      const opener = opening(mine.signal);
      const around = circled(path, screen.lines, screen.display, settings.circleLeast.value);
      if (path.length > 0) {
        const worded = screen.lines.filter((line) => line.text !== "").length;
        // A line outside the part he drew around comes with its place and no words, so the count shows the cut.
        const outside = worded < screen.lines.length ? "; the rest lie outside the part he drew around" : "";
        log(`${id}: he drew a path of ${path.length} points around line${around.length === 1 ? "" : "s"} ${around.join(", ") || "none"}${drawn ? "" : " on the hold before"}; ${worded} of ${screen.lines.length} lines came with their words${outside}`);
      }
      const asking = { id, words: words.text, seen: screen, circled: around, lesson, ahead, markUp, releasedAt: at, opener, signal: mine.signal };
      const shownBefore = lesson.shown;
      await ask({ ports, settings, send, log }, asking, (kept) => (lesson = kept));
      // What he asked and was told is kept for a while: if he now goes to another kept page, the next look is for
      // what he was sent there for.
      const told = lesson.shown.filter((line) => !shownBefore.includes(line));
      const here = whichPage(screen.lines.map((line) => line.text), ports.pages, settings.pageLeastLines.value);
      if (!mine.signal.aborted && told.length > 0) asked = { words: words.text, told, page: here?.name ?? null, at: Date.now() };
      keeping.answered(told, here ? [here, ...ports.pages] : ports.pages);
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
            cropAround: settings.cropAround.value,
            // The body looks without a key only when there is something to look for: kept pages, and a model to ask.
            ...(ports.glancer !== null && ports.pages.length > 0 && settings.lookEveryMs.value > 0 ? { lookEveryMs: settings.lookEveryMs.value } : {}),
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
        case "look":
          // A look he did not ask for never cuts into a hold or an answer.
          if (listening !== null || answering > 0) return;
          return glancing.take(line, asked !== null && Date.now() - asked.at < settings.followForMs.value ? asked : null);
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
