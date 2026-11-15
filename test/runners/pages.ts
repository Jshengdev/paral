// The runner for rows about a film of a run in which a step puts another page on the screen. The run is written by
// hand: two drawn pages, a look at each, and the flow file that names the second page. No mind, no service, no window.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fresh } from "./temp.ts";

const root = join(import.meta.dirname, "..", "..");
const headless = join(root, "body", ".build", "debug", "paral-headless");
const body = (...args: string[]) => JSON.parse(execFileSync(headless, args, { encoding: "utf8" }));
const display = { id: 2, scale: 1, x: 0, y: 0 };

/**
 * A run of one page, or of two when `second` is given, where the second comes up at `secondAt` ms. Gives back what
 * the film wrote about its pages, and which page's first line the Mac reads off an early frame, a late frame and
 * the second page's bare picture.
 */
export function filmedPages(input: { first: string[]; second?: string[]; secondAt: number; endAt: number }) {
  const dir = fresh("pages-film");
  mkdirSync(dir, { recursive: true });
  const pages = [input.first, ...(input.second ? [input.second] : [])].map((lines, index) => {
    const picture = join(dir, `shown-${index}.png`);
    return { picture, lines: body("page", picture, ...lines).lines, sentAs: join(dir, index === 0 ? "page-for-the-brain.jpg" : `page-${index}-for-the-brain.jpg`) };
  });
  const look = (at: number, page: (typeof pages)[number]) => ({ at, line: { v: 1, type: "look", at: 1 + at, display, picture: { path: page.sentAs, w: 1600, h: 1000 }, lines: page.lines } });
  const rows = [look(0, pages[0]), ...(pages[1] ? [look(input.secondAt, pages[1])] : []), { at: input.endAt, line: { v: 1, type: "clear" } }];
  writeFileSync(join(dir, "session.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  const asks = pages[1] ? [{ look: true }, { look: true, page: pages[1].picture }] : [{ look: true }];
  writeFileSync(join(dir, "flow.json"), JSON.stringify({ v: 1, display: { ...display, w: 1600, h: 1000 }, page: pages[0].picture, asks }));
  const made = JSON.parse(execFileSync(headless, ["film", dir, join(root, "body", "tokens.json")], { encoding: "utf8" }));
  const frames = join(dir, "frames");
  const firstLine = (picture: string) => (body("read", picture).lines[0]?.text as string | undefined) ?? "(nothing read)";
  const frame = (ms: number) => join(frames, `f_${String(Math.min(made.frames, Math.floor((ms * 30) / 1000) + 1)).padStart(5, "0")}.png`);
  return {
    bareFirstFrameReads: firstLine(join(frames, "f_00000.png")),
    anEarlyFrameReads: firstLine(frame(input.secondAt / 2)),
    aLateFrameReads: firstLine(frame((input.secondAt + input.endAt) / 2)),
    barePictures: readdirSync(frames).filter((file) => file.startsWith("bare-")).sort(),
    theSecondBarePictureReads: existsSync(join(frames, "bare-1.png")) ? firstLine(join(frames, "bare-1.png")) : null,
    pages: existsSync(join(frames, "pages.json")) ? JSON.parse(readFileSync(join(frames, "pages.json"), "utf8")) : null,
  };
}
