// The runner for the stop row: the real mind on a tape, stopped with a body still linked.
import { connect } from "node:net";
import { join } from "node:path";
import { tape } from "../../mind/adapters/tape.ts";
import { serve } from "../../mind/server.ts";
import { settings } from "../../mind/settings.ts";
import { fresh } from "./temp.ts";

/** Whether the body saw the end, and whether the mind stopped inside its limit. */
export async function stopped(input: { tape: string }) {
  const path = fresh("row") + ".sock";
  const mind = await serve(path, tape(join(import.meta.dirname, "..", "tapes", input.tape)), settings, () => {});
  const socket = connect(path);
  await new Promise((resolve) => socket.once("connect", resolve));
  const closed = new Promise<boolean>((resolve) => socket.once("close", () => resolve(true)));
  const began = Date.now();
  await mind.stop();
  return { bodySawTheEnd: await closed, insideTheLimit: Date.now() - began < settings.stopLimitMs.value };
}
