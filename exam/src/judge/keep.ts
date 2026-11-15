import { existsSync, readFileSync } from "node:fs";
import type { Expect } from "../shape.ts";
import { of, type Ask } from "../timeline.ts";
import { no, unseen, yes, type Verdict } from "../verdict.ts";
import { dates, monthNumber } from "./dates.ts";

// He asks it to keep a date. It writes one calendar file and hands it to the Mac to open; Calendar's own box then
// asks him, and he clicks Add himself. The run can see the file and what is in it. It cannot see Calendar, so what
// Calendar does with the file is not judged here. The file sits in the Mac's temporary folder under one fixed
// name, so a later run writes over it: a file that is gone or holds another day is "not shown", never a pass.
const C = "C19";

export function kept(ask: Ask, expect: Expect): Verdict[] {
  if (expect.keeps === undefined) return [];
  const s = ask.index;
  const [want] = dates(expect.keeps);
  if (!want) throw new Error(`"${expect.keeps}" names no month and day to keep`);
  const what = `It opens a calendar file for ${expect.keeps}`;
  const opened = of(ask.moments, "opened").filter((m) => m.path.endsWith(".ics"));
  if (opened.length !== 1) return [no(C, s, what, opened.length === 0 ? "no calendar file was handed to the Mac" : `${opened.length} calendar files were handed over`)];
  if (!existsSync(opened[0].path)) return [unseen(C, s, what, "a file was handed over, and it is gone now")];
  const start = /DTSTART[^:\n]*:(\d{4})(\d{2})(\d{2})/.exec(readFileSync(opened[0].path, "utf8"));
  if (!start) return [no(C, s, what, "the file names no start day")];
  const day = `the file starts on ${start[1]}-${start[2]}-${start[3]}`;
  return [Number(start[2]) === monthNumber(want.month) && Number(start[3]) === want.day ? yes(C, s, what, day) : unseen(C, s, what, `${day}; a later run may have written over it`)];
}
