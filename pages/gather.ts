// Reads USC's public pages ahead of time and keeps their text, so paral can speak of what a page says beyond the
// part on screen: its closed sections, and the pages it links to. Run it by hand: `node pages/gather.ts`.
// Each kept page is one JSON file in pages/kept/ with its address and the day it was read. Nothing is fetched while
// paral runs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readable } from "./readable.ts";

const here = import.meta.dirname;
type Listed = { name: string; url: string };
const listed: Listed[] = JSON.parse(readFileSync(join(here, "list.json"), "utf8"));

mkdirSync(join(here, "kept"), { recursive: true });
for (const { name, url } of listed) {
  // A plain browser-like request with no cookie and nothing about who is asking.
  const reply = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Macintosh) page reader", accept: "text/html" }, redirect: "follow" });
  if (!reply.ok) {
    console.log(`${name}: not kept, the page answered ${reply.status}`);
    continue;
  }
  const page = readable(await reply.text(), url);
  writeFileSync(join(here, "kept", `${name}.json`), JSON.stringify({ name, url, readOn: new Date().toISOString().slice(0, 10), ...page }, null, 1) + "\n");
  console.log(`${name}: kept "${page.title}", ${page.lines.length} lines, ${page.links.length} links to other pages`);
}
