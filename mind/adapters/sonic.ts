import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import type { Spoken, Voice } from "../ports.ts";
import type { Settings } from "../settings.ts";
import type { Credits } from "./ink.ts";

type Log = (line: string) => void;
type Hearing = { onSound: (pcm: Buffer) => void; onWords: (spoken: Spoken) => void; first: () => void; done: () => void; fail: (why: string) => void };

/** The live voice: Cartesia's text-to-speech socket, kept open between sentences, one context per sentence. */
export function sonic(key: string, settings: Settings, credits: Credits, log: Log): Voice {
  const hearing = new Map<string, Hearing>();
  let socket: WebSocket | null = null;
  let opening: Promise<WebSocket> | null = null;

  function open(): Promise<WebSocket> {
    if (socket?.readyState === WebSocket.OPEN) return Promise.resolve(socket);
    opening ??= new Promise<WebSocket>((resolve, reject) => {
      const fresh = new WebSocket(`wss://api.cartesia.ai/tts/websocket?cartesia_version=${settings.cartesiaVersion.value}`, { headers: { "X-API-Key": key } } as never);
      fresh.onopen = () => {
        socket = fresh;
        opening = null;
        resolve(fresh);
      };
      fresh.onerror = () => {
        opening = null;
        reject(new Error("the voice's connection failed"));
      };
      fresh.onclose = () => {
        if (socket === fresh) socket = null;
        for (const [, heard] of hearing) heard.fail("the voice's connection closed");
      };
      fresh.onmessage = (event) => {
        const said = JSON.parse(String(event.data));
        const heard = hearing.get(said.context_id);
        if (!heard) return;
        if (said.type === "chunk") {
          heard.first();
          heard.onSound(Buffer.from(said.data, "base64"));
        } else if (said.type === "timestamps") heard.onWords(said.word_timestamps);
        else if (said.type === "done") heard.done();
        else if (said.type === "error") heard.fail(said.message ?? said.title ?? "the voice reported an error");
      };
    });
    return opening;
  }

  return {
    warm() {
      open().catch((error) => log(`voice: could not connect ahead of time (${error instanceof Error ? error.message : error})`));
    },
    async say(text, signal, onSound, onWords) {
      if (credits.used >= settings.cartesiaCreditCap.value) throw new Error(`the ear and voice credit cap of ${settings.cartesiaCreditCap.value} is reached`);
      const live = await open();
      const context = randomUUID();
      const began = Date.now();
      let first: () => void = () => {};
      const firstSound = new Promise<"sound">((resolve) => (first = () => resolve("sound")));
      const finished = new Promise<void>((resolve, reject) => {
        hearing.set(context, { onSound, onWords, first, done: resolve, fail: (why) => reject(new Error(why)) });
      });
      finished.catch(() => {});
      const cancel = () => live.readyState === WebSocket.OPEN && live.send(JSON.stringify({ context_id: context, cancel: true }));
      signal.addEventListener("abort", cancel, { once: true });
      try {
        live.send(
          JSON.stringify({
            model_id: settings.voiceModel.value,
            transcript: text,
            voice: { mode: "id", id: settings.voiceId.value },
            language: "en",
            context_id: context,
            output_format: { container: "raw", encoding: "pcm_s16le", sample_rate: 24000 },
            add_timestamps: true,
            continue: false,
          }),
        );
        credits.used += text.length;
        const how = await Promise.race([firstSound, finished.then(() => "sound" as const), wait(settings.voiceFirstSoundMs.value, "late" as const, { signal })]);
        if (how === "late") {
          cancel();
          throw new Error(`the voice sent no sound inside ${settings.voiceFirstSoundMs.value} ms`);
        }
        log(`voice: first sound ${Date.now() - began} ms after the sentence was sent; ${Math.round(credits.used)} credits used`);
        await Promise.race([finished, new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))]);
      } finally {
        hearing.delete(context);
        signal.removeEventListener("abort", cancel);
      }
    },
  };
}
