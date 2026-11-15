import { cp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Scenario } from "./shape.ts";
import { EXAM, RUNS } from "./tools.ts";
import type { Verdict } from "./verdict.ts";

export type Judged = { scenario: Scenario; verdicts: Verdict[]; stills: { file: string; caption: string }[]; says: string[]; spentUsd: number | null; ranAt: string; /** The commit of the app this run was made on, where the judge recorded it. */ app?: string | null };

const safe = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const badge = (pass: boolean | null) => (pass === true ? '<b class="ok">works</b>' : pass === false ? '<b class="bad">fails</b>' : '<b class="dim">not shown</b>');

function worst(verdicts: Verdict[]): boolean | null {
  if (verdicts.some((v) => v.pass === false)) return false;
  return verdicts.some((v) => v.pass === true) ? true : null;
}

function summary(all: Judged[], names: Record<string, string>): string {
  const rows = Object.entries(names).map(([id, name]) => {
    const mine = all.flatMap((j) => j.verdicts.filter((v) => v.criterion === id).map((v) => ({ v, in: j.scenario.id })));
    const failing = mine.filter((m) => m.v.pass === false).map((m) => `${m.in}: ${safe(m.v.what)} (${safe(m.v.measured)})`);
    const state = mine.length === 0 ? '<b class="dim">no run yet</b>' : badge(worst(mine.map((m) => m.v)));
    return `<tr><td class="id">${id}</td><td>${safe(name)}</td><td>${state}</td><td class="why">${failing.slice(0, 2).join("<br>")}</td></tr>`;
  });
  return `<table><thead><tr><th></th><th>What it must do</th><th></th><th>Where it fails</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function card(j: Judged): string {
  const film = existsSync(join(RUNS, j.scenario.id, "run.mp4")) ? `<video controls preload="none" poster="${j.scenario.id}/${j.stills[2]?.file ?? "end.jpg"}" src="${j.scenario.id}/run.mp4"></video>` : '<p class="dim">No film of this run yet.</p>';
  const stills = j.stills.map((s) => `<figure><a href="${j.scenario.id}/${s.file}"><img loading="lazy" src="${j.scenario.id}/${s.file}" alt=""></a><figcaption>${safe(s.caption)}</figcaption></figure>`).join("");
  const row = (v: Verdict) => {
    const bar = v.limit ? ` <span class="dim">· bar: ${safe(v.limit)}</span>` : "";
    return `<tr><td class="id">${v.criterion}</td><td>${safe(v.what)}</td><td>${badge(v.pass)}</td><td class="why">${safe(v.measured)}${bar}</td></tr>`;
  };
  const failing = j.verdicts.filter((v) => v.pass === false);
  const passing = j.verdicts.filter((v) => v.pass === true).length;
  const short = failing.length === 0 ? `<p class="ok">All ${passing} checks pass.</p>` : `<table><tbody>${failing.map(row).join("")}</tbody></table>`;
  const said = j.says.map((line) => `<li>${safe(line)}</li>`).join("");
  const where = j.scenario.video ? `In the video at ${safe(j.scenario.video)}. ` : "Not in the video: the team's own. ";
  const spent = j.spentUsd === null ? "" : ` Spent $${j.spentUsd.toFixed(3)}.`;
  return `<section class="run"><h2>${safe(j.scenario.title)} ${badge(worst(j.verdicts))}</h2>
    <p class="dim">${where}Run ${safe(j.ranAt)}${j.app ? `, on the app at ${safe(j.app)}` : ", on a commit of the app that was not recorded"}.${spent}</p>
    ${film}<div class="strip">${stills}</div>
    <details><summary>What was said, line by line</summary><ol>${said}</ol></details>
    ${short}
    <details><summary>All ${j.verdicts.length} checks: ${passing} pass, ${failing.length} fail</summary><table><tbody>${j.verdicts.map(row).join("")}</tbody></table></details></section>`;
}

export async function explain(all: Judged[], names: Record<string, string>, notLive: string[], waiting: string[]): Promise<string> {
  const template = await readFile(join(EXAM, "explainer.html"), "utf8");
  const total = all.flatMap((j) => j.verdicts);
  const counted = (pass: boolean | null) => total.filter((v) => v.pass === pass).length;
  // Each run carries the commit of the app it was made on; the page names it once when every run shares it.
  const commits = [...new Set(all.map((j) => j.app ?? null))];
  const app = commits.length === 1 && commits[0] ? ` The app judged is commit ${commits[0]}.` : " The runs are not all of one recorded commit of the app; each says which.";
  const lede = `${counted(true)} checks pass, ${counted(false)} fail and ${counted(null)} could not be shown, over ${all.length} filmed runs.${app}`;
  const page = template.replace("<!--LEDE-->", safe(lede)).replace("<!--SUMMARY-->", summary(all, names))
    .replace("<!--RUNS-->", all.map(card).join("\n")).replace("<!--NOTLIVE-->", notLive.map((line) => `<li>${safe(line)}</li>`).join(""))
    .replace("<!--WAITING-->", waiting.map((line) => `<li>${safe(line)}</li>`).join(""));
  await cp(join(EXAM, "vendor"), join(RUNS, "vendor"), { recursive: true });
  const out = join(RUNS, "index.html");
  await writeFile(out, page);
  return out;
}
