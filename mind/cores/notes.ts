/**
 * The notes he takes away at the end of a sitting: one page, the things to do in order, each with its date, where it
 * is, the kept page's own sentence and a cut-out picture of the section. Values in, one HTML page out.
 */

/** A date the page gives: as the page writes it, and how far off it is from the day of the notes, in words ("7 days left"). */
export type Due = { asWritten: string; left: string };

/** Where a thing to do lives: the page's title, its address, and the heading of the section it sits under ("" for none). */
export type Where = { page: string; url: string; section: string };

/**
 * One thing to do. `quote` is the kept page's own line for it ("" when none is known). `picture` is a path or a data:
 * URL of the section cut out of his screen; null when there is none. `done` says why it is done ("in your calendar"),
 * or is null while it is not.
 */
export type Item = { todo: string; due: Due | null; where: Where; quote: string; picture: string | null; done: string | null };

/** A sitting's notes. `goal` is his first question in his own words, null when he asked none; `made` is the day, as it should read. */
export type Notes = { title: string; goal: string | null; made: string; items: Item[]; couldNotTell: string[] };

/** Where the page finds its sheets and DialKit. The page reads right when any of them is missing: its look is inline. */
export type Links = { sheets: string[]; dialkit: string | null };

/** Text made safe to sit inside HTML or a quoted attribute: nothing a page says can become markup. */
export function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** An address a link may go to: the web, a file, or a path. Anything else (a javascript: link) goes nowhere. */
function safeUrl(url: string): string {
  return /^(https?:|file:|\.{0,2}\/|[\w-]+(\/|\.))/i.test(url.trim()) ? url.trim() : "#";
}

/** A picture source: an image data: URL or a path. Anything else gives no picture rather than a broken or unsafe one. */
function safePicture(src: string | null): string | null {
  if (src === null || src.trim() === "") return null;
  const s = src.trim();
  return /^data:image\//i.test(s) || !/^[a-z][\w+.-]*:/i.test(s) || /^(https?|file):/i.test(s) ? s : null;
}

/** The chip beside an item: why it is done when it is, else the page's date and how far off it is, else nothing. */
function chip(item: Item): string {
  if (item.done !== null) return `<span class="chip quiet">${escape(item.done)}</span>`;
  if (item.due === null) return "";
  return `<span class="chip">${escape(item.due.asWritten)}${item.due.left === "" ? "" : ` · ${escape(item.due.left)}`}</span>`;
}

/** The cut-out: small beside its item, full size under it on hover or focus, at reading size on paper. */
function shot(item: Item, n: number): string {
  const src = safePicture(item.picture);
  if (src === null) return "";
  const named = item.where.section || item.where.page;
  const alt = escape(`The section "${named}" as it showed on your screen`);
  return `<div class="shot" tabindex="0" aria-label="Picture of the section ${escape(named)}, step ${n}">`
    + `<img class="thumb" src="${escape(src)}" alt="${alt}">`
    + `<div class="big"><img src="${escape(src)}" alt=""></div></div>`;
}

/** One numbered item: what to do and its chip, where to find it, the page's own sentence, and its picture. */
function itemHtml(item: Item, n: number): string {
  const where = item.where;
  const under = where.section === "" ? "" : `, under <b>${escape(where.section)}</b>`;
  const quote = item.quote === "" ? "" : `<blockquote>“${escape(item.quote)}”</blockquote>`;
  return `<li class="item${item.done !== null ? " done" : ""}"><span class="n">${n}</span><div class="body">`
    + `<p class="todo">${escape(item.todo)}</p>${chip(item)}`
    + `<p class="where">Find it: <a href="${escape(safeUrl(where.url))}">${escape(where.page)}</a>${under}</p>`
    + `${quote}</div>${shot(item, n)}</li>`;
}

// The look stands alone: the brand's values sit here so the page reads right with no sheet. A linked sheet loads
// first, so these win where they differ.
const CSS = `
:root{--ink:#141414;--stone:#8a8a8a;--mist:#e4e4e4;--paper:#f4f4f4;--white:#fff;--cardinal:#990000;
--read:17px;--thumb:132px;--full:820px;--gap:28px}
*{box-sizing:border-box}
body{margin:0;background:var(--white);color:var(--ink);font:400 var(--read)/1.5 "DM Sans",system-ui,-apple-system,"Helvetica Neue",sans-serif}
main{max-width:880px;margin:0 auto;padding:48px 28px 72px}
@media(min-width:1180px){main{margin-left:max(0px,calc(50vw - 610px))}} /* clear of the DialKit panel at the top right */
header{margin-bottom:calc(var(--gap) * 1.2)}
.brand{display:flex;align-items:center;gap:8px;font:italic 600 1.05em/1 Fraunces,Georgia,serif;color:var(--ink);margin:0 0 22px}
.brand svg{width:26px;height:26px}
h1{font-weight:500;font-size:2em;line-height:1.15;letter-spacing:-.01em;margin:0 0 10px}
.goal{margin:0;color:var(--ink)}.goal span{color:var(--stone)}
.count{margin:6px 0 0;color:var(--stone);font-size:.88em}
ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:calc(var(--gap) * .5)}
.item{position:relative;display:grid;grid-template-columns:2.2em 1fr auto;gap:0 18px;align-items:start;background:var(--paper);border-radius:14px;padding:18px 20px}
.n{font-weight:500;font-size:1.35em;line-height:1.2;color:var(--cardinal);font-variant-numeric:tabular-nums}
.body{min-width:0}
.todo{margin:0;font-weight:500;font-size:1.1em;line-height:1.35}
.chip{display:table;margin:6px 0 2px;padding:2px 9px;border:1px solid var(--cardinal);border-radius:999px;color:var(--cardinal);font-weight:500;font-size:.76em;line-height:1.5;white-space:nowrap}
.chip.quiet{border-color:var(--mist);color:var(--stone);background:var(--white)}
.where{margin:6px 0 0;font-size:.86em;color:var(--ink)}
.where a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--stone);text-underline-offset:3px;overflow-wrap:anywhere}
.where b{font-weight:500}
blockquote{margin:8px 0 0;padding:0 0 0 12px;border-left:2px solid var(--mist);font-size:.82em;color:#2a2a2a}
.done .todo,.done blockquote,.done .where{color:var(--stone)}.done .n{color:var(--stone)}
.done .todo{text-decoration:line-through;text-decoration-thickness:1px}
.shot{width:var(--thumb);border-radius:8px;outline:none;cursor:zoom-in}
.thumb{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--mist);background:var(--white)}
.shot:focus-visible .thumb{outline:2px solid var(--ink);outline-offset:2px}
.big{display:none;position:absolute;z-index:5;left:0;right:0;top:100%;padding-top:8px}
.big img{display:block;width:min(100%,var(--full));margin-left:auto;height:auto;border-radius:12px;border:1px solid var(--mist);background:var(--white);box-shadow:0 18px 40px rgba(20,20,20,.18)}
.shot:hover .big,.shot:focus .big,.shot:focus-within .big{display:block}
footer{margin-top:calc(var(--gap) * 1.6);padding-top:20px;border-top:1px solid var(--mist)}
h2{font-weight:500;font-size:1.15em;margin:0 0 8px}
footer ul{margin:0 0 18px;padding-left:1.1em}
.made{margin:0;color:var(--stone);font-size:.84em}
@media(max-width:640px){.item{grid-template-columns:1.8em 1fr}.shot{grid-column:2;margin-top:12px}}
@media print{
  [class*=dialkit]{display:none!important}
  body{font-size:11pt}main{max-width:none;padding:0}
  .item{grid-template-columns:2em 1fr;break-inside:avoid;background:none;border:1px solid var(--mist)}
  .shot{grid-column:2;width:auto;margin-top:10px}.thumb{width:100%;max-width:11cm}.big{display:none!important}
  .where a::after{content:" (" attr(href) ")";color:var(--stone);font-size:.9em}
}`;

// DialKit binds the values tuned by feel: type size, the picture's two sizes, the room between items. Missing or
// broken, the page stays as the CSS above sets it.
const JS = `
try {
  if (typeof DialKit === "undefined") throw new Error("DialKit is not loaded");
  DialKit.createDialRoot();
  const kit = DialKit.createDialKit("The notes", { size: [17, 13, 24, 0.5], thumb: [132, 72, 260, 4], full: [820, 420, 1200, 10], gap: [28, 10, 64, 1] });
  kit.subscribe(v => { const r = document.documentElement.style;
    r.setProperty("--read", v.size + "px"); r.setProperty("--thumb", v.thumb + "px");
    r.setProperty("--full", v.full + "px"); r.setProperty("--gap", v.gap + "px"); });
} catch (err) { console.warn("DialKit did not start", err); }`;

// The team's logo mark, in its cardinal, without the edge and shadow made for dark grounds.
const MARK = `<svg viewBox="30 30 88 88" aria-hidden="true"><path fill="#990000" d="M34.9505 53.2869C32.4991 42.3026 42.3031 32.4985 53.2874 34.95L102.297 45.8878C114.12 48.5265 118.378 63.1742 109.812 71.7401L71.7407 109.812C63.1747 118.378 48.527 114.119 45.8883 102.296L34.9505 53.2869Z"/></svg>`;

/** The whole page for a sitting's notes, items in the order given. With no links it stands alone. */
export function notesPage(notes: Notes, links: Links = { sheets: [], dialkit: null }): string {
  const done = notes.items.filter((item) => item.done !== null).length;
  const sheets = links.sheets.map((href) => `<link rel="stylesheet" href="${escape(href)}">`).join("");
  const kitCss = links.dialkit === null ? "" : `<link rel="stylesheet" href="${escape(links.dialkit)}styles.css">`;
  const kitJs = links.dialkit === null ? "" : `<script src="${escape(links.dialkit)}browser.global.js"></script>`;
  const unknown = notes.couldNotTell.length === 0
    ? `<p>Nothing left open.</p>`
    : `<ul>${notes.couldNotTell.map((line) => `<li>${escape(line)}</li>`).join("")}</ul>`;
  const goal = notes.goal === null ? "" : `<p class="goal"><span>You asked:</span> “${escape(notes.goal)}”</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(notes.title)} · lost and found</title>
<meta name="viewport" content="width=device-width,initial-scale=1">${sheets}${kitCss}<style>${CSS}</style></head><body><main>
<header><p class="brand">${MARK}lost and found</p><h1>${escape(notes.title)}</h1>${goal}
<p class="count">${notes.items.length} ${notes.items.length === 1 ? "thing" : "things"} to do, in this order · ${done} done</p></header>
<ol>${notes.items.map((item, i) => itemHtml(item, i + 1)).join("\n")}</ol>
<footer><h2>What Lost and Found could not tell you</h2>${unknown}
<p class="made">Notes made ${escape(notes.made)}. Every date here is the page's own, as the page writes it.</p></footer>
</main>${kitJs}<script>${JS}</script></body></html>`;
}
