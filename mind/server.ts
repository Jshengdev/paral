import { createWriteStream, rmSync, type WriteStream } from "node:fs";
import { createServer, type Socket } from "node:net";
import { FromBody, FromMind, read, write } from "../seam/schema.ts";
import type { Ports } from "./ports.ts";
import type { Settings } from "./settings.ts";
import { turns } from "./turn.ts";

export type Mind = { stop(): Promise<void> };
type Log = (line: string) => void;

/** Listens on one socket. With `recordTo`, every line that crosses the seam is written there with its time. */
export function serve(path: string, ports: Ports, settings: Settings, log: Log, recordTo?: string): Promise<Mind> {
  rmSync(path, { force: true });
  const linked = new Set<Socket>();
  const tape: WriteStream | null = recordTo ? createWriteStream(recordTo) : null;
  const server = createServer((socket) => {
    const began = Date.now();
    const record = (from: "body" | "mind", line: unknown) => tape?.write(JSON.stringify({ at: Date.now() - began, from, line }) + "\n");
    linked.add(socket);
    socket.on("close", () => linked.delete(socket));
    const turn = turns(
      ports,
      settings,
      (line) => {
        if (!socket.writable) return;
        socket.write(write(FromMind, line));
        record("mind", line);
      },
      log,
    );
    let pending = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const text of lines.filter((line) => line.trim() !== "")) {
        const got = read(FromBody, text);
        if (!got.ok) {
          log(`refused a line from the body: ${got.why}`);
          continue;
        }
        record("body", got.line);
        void turn.take(got.line);
      }
    });
    socket.on("error", (error) => log(`socket: ${error.message}`));
  });
  const stop = () =>
    new Promise<void>((resolve) => {
      for (const socket of linked) socket.destroy();
      server.close(() => (tape ? tape.end(resolve) : resolve()));
    });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(path, () => resolve({ stop }));
  });
}
