// Where every piece of text on the page really is, in page points, written into the page for the exam to read.
// So the judge knows the truth without asking the tutor: a wrong reading then shows as a wrong landing.
// - A run of text gets a tight box. It is named by its element's data-id when it has one, else "text-N".
// - An element with data-id that holds other elements (a table, a code block) also gets its whole box, as a thing
//   a scenario can circle.
// - Only text that can be seen in the window counts: a real page holds much more than the picture shows.
addEventListener("load", () => {
  const seen = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const truth = [];
  const box = (r) => ({ x: r.x, y: r.y, w: r.width, h: r.height });
  for (const el of document.querySelectorAll("[data-id]")) {
    const r = el.getBoundingClientRect();
    // A real page has data-ids of its own, some inside a section that is closed: a thing with no size is not on the page.
    if (el.children.length > 0 && r.width > 0 && r.height > 0) truth.push({ id: el.dataset.id, text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 80), box: box(r) });
  }
  const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT);
  let unnamed = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim().replace(/\s+/g, " ");
    if (text === "") continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (!seen(rect) || !node.parentElement.checkVisibility({ visibilityProperty: true })) continue;
    const named = node.parentElement.dataset.id;
    truth.push({ id: named ?? `text-${++unnamed}`, text, box: box(rect) });
  }
  const pre = document.createElement("pre");
  pre.id = "truth";
  pre.hidden = true;
  pre.textContent = JSON.stringify(truth);
  document.body.append(pre);
});
