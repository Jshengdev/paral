import { setTimeout as wait } from "node:timers/promises";
import type { Ear } from "../ports.ts";
import type { Settings } from "../settings.ts";

export type Credits = { used: number };
type Log = (line: string) => void;

/** His voice as the seam carries it: 16-bit sound at 16 kHz, one channel (seam/README.md). */
const RATE = 16000;
/** What a second of listening is counted at against the credit cap. From Cartesia's price page on 2026-11-14; an estimate, not a bill. */
const CREDITS_A_SECOND = 3;

/** The live ear: Cartesia's speech-to-text socket, one connection per ask, opened when the key goes down. */
export function ink(key: string, settings: Settings, credits: Credits, log: Log): Ear {
  return {
    listen(onWords, signal) {
      if (credits.used >= settings.cartesiaCreditCap.value) throw new Error(`the ear and voice credit cap of ${settings.cartesiaCreditCap.value} is reached`);
      const url = `wss://api.cartesia.ai/stt/websocket?model=${settings.earModel.value}&encoding=pcm_s16le&sample_rate=${RATE}&cartesia_version=${settings.cartesiaVersion.value}`;
      const socket = new WebSocket(url, { headers: { "X-API-Key": key } } as never);
      const waiting: Buffer[] = [];
      let settled = "";
      let unsettled = "";
      let failed: string | null = null;
      let bytes = 0;
      let flushed: (() => void) | null = null;
      const opened = new Promise<boolean>((resolve) => {
        socket.onopen = () => {
          for (const pcm of waiting.splice(0)) socket.send(pcm);
          resolve(true);
        };
        socket.onerror = () => {
          failed ??= "its connection failed";
          resolve(false);
          flushed?.();
        };
      });
      socket.onmessage = (event) => {
        const said = JSON.parse(String(event.data));
        if (said.type === "transcript") {
          if (said.is_final) {
            settled += said.text;
            unsettled = "";
          } else unsettled = said.text;
          onWords((settled + unsettled).trim());
        } else if (said.type === "flush_done" || said.type === "done") flushed?.();
        else if (said.type === "error") {
          failed = said.message ?? said.title ?? "it reported an error";
          flushed?.();
        }
      };
      signal.addEventListener("abort", () => socket.close());

      return {
        sound(pcm) {
          bytes += pcm.length;
          if (socket.readyState === WebSocket.OPEN) socket.send(pcm);
          else waiting.push(pcm);
        },
        async finish() {
          const open = await Promise.race([opened, wait(settings.earOpenMs.value, false, { signal })]);
          if (!open) throw new Error(`the ear did not answer (${failed ?? `no connection inside ${settings.earOpenMs.value} ms`})`);
          const done = new Promise<"flushed">((resolve) => (flushed = () => resolve("flushed")));
          socket.send("finalize");
          const how = await Promise.race([done, wait(settings.earFinishMs.value, "late" as const, { signal })]);
          if (how === "late") log(`the ear's last words did not arrive inside ${settings.earFinishMs.value} ms; going on with what was heard`);
          socket.send("close");
          const seconds = bytes / 2 / RATE;
          credits.used += seconds * CREDITS_A_SECOND;
          log(`ear: ${seconds.toFixed(1)} s of sound; ${Math.round(credits.used)} credits used of ${settings.cartesiaCreditCap.value}`);
          if (failed && settled + unsettled === "") throw new Error(`the ear failed (${failed})`);
          return (settled + unsettled).trim();
        },
      };
    },
  };
}
