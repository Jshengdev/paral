#!/bin/sh
# One judged pass of named scenarios against the app as committed, without stopping whoever is building.
# usage: exam/pass.sh CLONE ROUND scenario...
#   CLONE     a clone of this repo checked out at the commit to judge, already built ((cd body && swift build))
#   ROUND     a name for this pass; its records are kept under ${PARAL_PASSES:-/tmp/paral-passes}/ROUND
# The clone gives the app (and its own kept pages). This folder gives the judge (exam/) and each scenario's prepared
# page and asks (tmp/runs/<scenario>, from `node exam/run.ts prepare`). A live pass calls the paid services.
build=$(cd "$(dirname "$0")/.." && pwd)
[ $# -ge 3 ] || { echo "usage: exam/pass.sh CLONE ROUND scenario..." >&2; exit 2; }
clone=$1; round=$2; shift 2
[ -d "$clone/.git" ] || { echo "pass: $clone is not a clone of the build" >&2; exit 2; }
out=${PARAL_PASSES:-/tmp/paral-passes}/$round
mkdir -p "$out"
rsync -a --delete "$build/exam/" "$clone/exam/"
echo "app code: $(git -C "$clone" log --oneline -1) | judge: $(git -C "$build" log --oneline -1 -- exam), $(git -C "$build" status --short exam | wc -l | tr -d ' ') of its files not yet committed" >> "$out/log"
for s in "$@"; do
  date "+$s start %H:%M:%S" >> "$out/log"
  [ -f "$build/tmp/runs/$s/flow.json" ] || { echo "$s: not prepared in the build (node exam/run.ts prepare $s)" >> "$out/log"; continue; }
  mkdir -p "$clone/tmp/runs/$s"
  rsync -a --include "flow.json" --include "truth*.json" --include "page*.png" --include "ask-*.wav" --exclude "*" "$build/tmp/runs/$s/" "$clone/tmp/runs/$s/"
  (cd "$clone" && ./flow "tmp/runs/$s/flow.json") > "$out/$s.flow.log" 2>&1 || echo "$s: flow failed" >> "$out/log"
  (cd "$clone" && ./film "tmp/runs/$s") > "$out/$s.film.log" 2>&1 || echo "$s: film failed" >> "$out/log"
  (cd "$clone" && node exam/run.ts judge "$s") > "$out/$s.judge.txt" 2>&1
  # The receipts of the round, kept apart from the clone so the next round does not write over them.
  for f in verdicts.json spend.json session.jsonl mind.log drawn.jsonl; do cp "$clone/tmp/runs/$s/$f" "$out/$s.$f" 2>/dev/null; done
  grep -E "pass, .* fail|fails|not shown:|rror" "$out/$s.judge.txt" | cut -c1-330 >> "$out/log"
done
date "+done %H:%M:%S" >> "$out/log"
cat "$out/log"
