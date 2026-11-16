import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { boxes, fitted, split, wipes } from "../mind/cores/beats.ts";
import { asksFor, fits, hear, saysOnly, silence, unasked } from "../mind/cores/catch.ts";
import { broadFollowUp } from "../mind/cores/full.ts";
import { columnRows, drawsWhatWasSaid } from "../mind/cores/board.ts";
import { away, datesIn, daysFrom, unknownDate, type Named } from "../mind/cores/dates.ts";
import { calendarFile, dateLine, named, when } from "../mind/cores/keep.ts";
import { guideGoal, guideNext } from "./runners/guide.ts";
import { foldedUnder, headingOf, movedUnder, whichPage, whichWay } from "../mind/cores/page.ts";
import { showable, unfit } from "../mind/cores/fit.ts";
import { circled, echo } from "../mind/cores/circle.ts";
import { happened } from "../mind/cores/happened.ts";
import { settled } from "../mind/cores/partial.ts";
import { locate } from "../mind/cores/ground.ts";
import { pick, seconds } from "../mind/cores/lesson.ts";
import { next, type Happened } from "../mind/cores/teach.ts";
import { givesAway, judge, wrongSum, type Judged } from "../mind/cores/push.ts";
import { empty, fold, NO_RUNG } from "../mind/cores/hold.ts";
import { FromBody, FromMind, read, write } from "../seam/schema.ts";
import { settings } from "../mind/settings.ts";
import { keptLook, keptVoice, standIn } from "./runners/adapters.ts";
import { warmed } from "./runners/warm.ts";
import { capsule, cardOnFilm, filmed, landing, pressedAgain, sameToTheWatcher } from "./runners/body.ts";
import { pill } from "./runners/pill.ts";
import { label, labelOnFilm, labelRecord } from "./runners/label.ts";
import { orbLight, orbWakes } from "./runners/orb.ts";
import { linesToTheMind, pillOnInk } from "./runners/ink.ts";
import { stopped } from "./runners/stop.ts";
import { notesRuns } from "./runners/notes.ts";
import { playTurn } from "./runners/turn.ts";
import { boardColumn, boardFits, boardGrows, boardRows, columnOnFilm, wholeOnFilm, boardType } from "./runners/boards.ts";
import { filmedPages } from "./runners/pages.ts";
import { cursor, cursorInside, guide, inkInside, resting, steps, toast, way } from "./runners/placed.ts";
import { lead } from "./runners/leads.ts";
import { waiting } from "./runners/echo.ts";
import { stands } from "./runners/stands.ts";
import { cardLines, clickPicture, curves, lifted, moves, scaled, toastTick } from "./runners/motion.ts";
import { apart, nudge, order, seen, usc } from "./runners/nudge.ts";
import { follow } from "./runners/follow.ts";
import { scrollButton, wayTag } from "./runners/ways.ts";
import { marks } from "./runners/marks.ts";
import { bank, centre } from "./runners/centre.ts";
import { sheetPlace } from "./runners/sheet.ts";

// A row is JSON on disk: its "in" is whatever its runner takes, so it is typed where the runner reads it.
type Row = { name: string; run: string; in: any; out: unknown };
type Filed = Row & { file: string };

const root = join(import.meta.dirname, "..");
const runs: Record<string, (input: any) => unknown> = {
  kept: keptVoice,
  "kept.look": keptLook,
  "live.standin": standIn,
  "live.warm": warmed,
  "beats.fitted": (input) => Object.fromEntries(Object.entries(input.marks).map(([name, [kind, text]]: [string, any]) => [name, fitted(kind, text, input.lines, input.reach, input.scale)])),
  "beats.split": (input) => Object.fromEntries(Object.entries(input.sentences).map(([name, text]) => [name, split(text as string, input.limits)])),
  fit: (input) => Object.fromEntries(input.lines.map((line: string) => [line, unfit(line)])),
  "fit.showable": (input) => Object.fromEntries(input.messages.map((message: string) => [message.slice(0, 60), showable(message)])),
  "beats.boxes": (input) => Object.fromEntries(Object.entries(input.boards).map(([name, rows]) => [name, boxes(rows as string[][])])),
  "push.givesAway": (input) => givesAway(input.planned, input.result),
  partial: (input) => Object.fromEntries(Object.entries(input.cases).map(([name, text]) => [name, settled(text as string)])),
  "beats.wipes": (input) => input.cases.map(([fresh, last, now]: [boolean, string | null, string | null]) => wipes(fresh, last, now)),
  prompts: () =>
    Object.fromEntries(
      ["answer", "second-look", "opener", "glance", "work-through", "whole-board", "full-answer", "steps-column"].map((name) => [
        name,
        createHash("sha256").update(readFileSync(join(import.meta.dirname, "..", "mind", "prompts", `${name}.md`))).digest("hex").slice(0, 12),
      ]),
    ),
  turn: playTurn,
  "body.landing": landing,
  "body.filmed": filmed,
  "body.capsule": capsule,
  "body.card": cardOnFilm,
  "body.pressedAgain": pressedAgain,
  "body.same": sameToTheWatcher,
  "body.way": way,
  "body.cursor": cursor,
  "body.steps": steps,
  "body.toast": toast,
  "body.guide": guide,
  "body.lead": lead,
  "body.echo": waiting,
  "body.stands": stands,
  "body.curves": curves,
  "body.moves": moves,
  "body.lifted": lifted,
  "body.scaled": scaled,
  "body.cardLines": cardLines,
  "body.toastTick": toastTick,
  "body.click": clickPicture,
  "body.resting": resting,
  "body.cursorInside": cursorInside,
  "body.inkInside": inkInside,
  "body.pill": pill, "body.orbLight": orbLight, "body.orbWakes": orbWakes,
  "body.pillOnInk": pillOnInk, "body.label": label, "body.labelRecord": labelRecord, "body.labelOnFilm": labelOnFilm,
  "body.linesToTheMind": linesToTheMind,
  "body.boardType": boardType,
  "body.boardFits": boardFits,
  "body.boardRows": boardRows,
  "body.wholeOnFilm": wholeOnFilm,
  "body.pages": filmedPages,
  "body.nudge": nudge,
  "body.order": order,
  "body.follow": follow,
  "body.wayTag": wayTag,
  "body.scrollButton": scrollButton,
  "body.seen": seen,
  "body.marks": marks,
  "body.apart": apart,
  "body.usc": usc,
  "body.centre": centre, "ready.bank": bank,
  catch: (input) => input.events.reduce(hear, silence),
  "catch.unasked": (input) => Object.fromEntries(input.holds.map((words: string) => [words, unasked(words, input.filler)])),
  "catch.only": (input) => Object.fromEntries(input.asks.map((words: string) => [words, saysOnly(words, input.phrases)])),
  // Which of his words ask for the whole thing drawn, by the setting itself: the list is what a row should hold.
  "full.asks": (input) => Object.fromEntries(input.asks.map((words: string) => [words, { first: broadFollowUp(words, settings.fullAnswerAsks.value, []), after: broadFollowUp(words, settings.fullAnswerAsks.value, ["An answer."]) }])),
  "board.asks": (input) => Object.fromEntries(input.asks.map((words: string) => [words, asksFor(words, settings.wholeBoardAsks.value)])),
  "board.grows": boardGrows,
  "column.asks": (input) => Object.fromEntries(input.asks.map((words: string) => [words, { first: drawsWhatWasSaid(words, settings.columnAsks.value, []), after: drawsWhatWasSaid(words, settings.columnAsks.value, ["An answer."]) }])),
  "column.cues": () => settings.cueCards.value.flatMap((card) => card.lines.filter((line) => drawsWhatWasSaid(line, settings.columnAsks.value, ["An answer."])).map((line) => `${card.name}: ${line}`)),
  "column.rows": (input) => input.boards.map((board: string[][] | null) => columnRows(board, input.most)),
  "body.boardColumn": boardColumn, "body.columnOnFilm": columnOnFilm,
  "catch.drawing": (input) => Object.fromEntries(input.asks.map((words: string) => [words, asksFor(words, input.phrases)])),
  "page.which": (input) => whichPage(input.seen, input.kept, input.least)?.name ?? null,
  "page.moved": (input) => input.cases.map(([then, now]: [any[], any[]]) => movedUnder(then, now, input.least)),
  "page.heading": (input) => input.cases.map(([line, named]: [string, string]) => headingOf(input.page, line, named)),
  "guide.next": guideNext,
  "guide.goal": guideGoal,
  "sheet.place": sheetPlace,
  "page.folded": (input) => input.cases.map(([seen, line]: [string[], string]) => foldedUnder(seen, input.page, line)),
  "page.way": (input) => input.cases.map(([seen, line]: [string[], string]) => whichWay(seen, input.page, line)),
  "dates.away": (input) => input.cases.map(([line, today]: [string, string]) => away(line, new Date(today))?.words ?? null),
  "dates.in": (input) => input.texts.map((text: string) => datesIn(text)),
  "keep.when": (input) => input.cases.map(([written, today]: [string, string]) => when(written, new Date(today))),
  "keep.file": (input) => input.cases.map((entry: any) => calendarFile({ ...entry, today: new Date(entry.today) })),
  "keep.line": (input) => ({ named: input.named.map(([written, page]: [string, string]) => named(written, page)), kept: input.said.map((said: string) => dateLine(said, input.pages)) }),
  "dates.unknown": (input) => input.cases.map(([said, sources]: [string, string[]]) => unknownDate(said, sources)),
  "dates.days": (input) => input.cases.map(([today, date]: [string, Named]) => daysFrom(new Date(today), date)),
  "catch.fits": (input) => input.cases.map(([drafted, final]: [string, string]) => fits(drafted, final, { share: input.share, least: input.least ?? 0, small: input.small ?? [] })),
  circle: (input) =>
    Object.fromEntries(
      Object.entries(input.trails).map(([name, trail]: [string, any]) => [
        name,
        {
          lines: circled(trail, input.lines, input.display, input.least),
          comesBackAs: echo(trail, { lines: input.lines, display: input.display }, input.least),
          beforeThePageIsRead: echo(trail, null, input.least)?.shape ?? null,
        },
      ]),
    ),
  lesson: (input) => ({
    shown: Object.fromEntries(Object.entries(input.cases).map(([name, on]: [string, any]) => [name, pick(input.examples, on.lines, on.result)?.left ?? null])),
    seconds: Object.fromEntries(Object.entries(input.mp4).map(([name, hex]) => [name, seconds(Buffer.from(hex as string, "hex"))])),
  }),
  ground: (input) => locate(input.quoted, input.lines, input.display, input.minScore, input.index ?? null),
  teach: (input) => {
    let rung = NO_RUNG;
    return input.happened.map((what: Happened) => {
      const move = next(rung, what, input.rungs);
      rung = move.rung;
      return move;
    });
  },
  happened: (input) => happened(input.seen, input.justTellMe, input.sameLineScore),
  stop: stopped,
  ...notesRuns,
  push: (input) => judge(input),
  "push.sums": (input) => input.lines.map((line: string) => wrongSum(line)),
  "push.count": (input) => {
    const verdicts = input.lines.map((line: Judged & { leaks: boolean }) => ({ leaks: line.leaks, caught: judge(line).verdict === "leak" }));
    return {
      leaking: verdicts.filter((v: any) => v.leaks).length,
      caught: verdicts.filter((v: any) => v.leaks && v.caught).length,
      falseAlarms: verdicts.filter((v: any) => !v.leaks && v.caught).length,
    };
  },
  hold: (input) => input.events.reduce(fold, empty),
  "hold.drawn": (input) => {
    let lesson = empty;
    return input.events.map((event: any) => (lesson = fold(lesson, event)).drawn);
  },
  "seam.read": (input) => read(input.from === "body" ? FromBody : FromMind, input.text),
  "seam.write": (input) => write(input.from === "body" ? FromBody : FromMind, input.line),
  size: (input) => {
    const long = (path: string) => readFileSync(path, "utf8").split("\n").length;
    const files = input.folders.flatMap((folder: string) =>
      (readdirSync(join(root, folder), { recursive: true }) as string[]).filter((file) => /\.(ts|swift)$/.test(file)).map((file) => join(folder, file)),
    );
    return { tooLong: files.filter((file: string) => long(join(root, file)) > input.limit), testFileFits: long(import.meta.filename) <= input.testLimit };
  },
  settings: () => Object.entries(settings).filter(([, s]) => !s.why.trim() || !s.measured.trim()).map(([name]) => name),
};

const dir = join(import.meta.dirname, "rows");
const only = process.env.ROWS ?? "";
const rows: Filed[] = readdirSync(dir)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => ({ ...JSON.parse(readFileSync(join(dir, file), "utf8")), file }));

const chosen = rows.filter((row) => row.name.includes(only));
if (chosen.length === 0) test(`no row's name contains "${only}"`, () => assert.fail("the filter matched nothing, so nothing was checked"));

for (const row of chosen) {
  test(row.name, async () => {
    const run = runs[row.run];
    assert.ok(run, `no runner called "${row.run}"`);
    const did = JSON.parse(JSON.stringify(await run(row.in)));
    // SHOW=1 prints what the row did, one item a line, for reading.
    if (process.env.SHOW === "1") console.log(`--- ${row.file}\n${(Array.isArray(did) ? did : [did]).map((item) => JSON.stringify(item)).join("\n")}`);
    // FREEZE=1 fills in a new row whose "out" is null with what happened, and fails so that it is read before it is trusted.
    if (process.env.FREEZE === "1" && row.out === null) {
      const { file, ...kept } = row;
      writeFileSync(join(dir, file), JSON.stringify({ ...kept, out: did }, null, 1) + "\n");
      assert.fail(`wrote what happened into ${file}; read it before trusting it`);
    }
    assert.deepEqual(did, row.out);
  });
}
