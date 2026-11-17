import CoreGraphics
import Foundation

extension Scene {
    public func picture(at t: Double) -> Picture {
        let marks = marksUp(at: t), tags = tagsUp(at: t), board = board(at: t), way = way(at: t)
        var capsule = capsule(at: t)
        var pointer = pointer(at: t)
        pointer?.thinking = capsule.look == .thinking
        if capsule.look == .thinking { pointer?.working = working(at: t) }
        pointer?.press = press(at: t)
        let clip = clip(at: t)
        capsule.closes = capsule.look == .rest && (!marks.isEmpty || !tags.isEmpty || way != nil || board != nil || clip != nil)
        dress(&capsule, at: t, cursorUp: pointer != nil)
        let nudge = nudge(at: t)
        return Picture(clock: t, capsule: capsule, marks: marks, echo: echo(at: t), way: way, pointer: pointer, click: still ? nil : click(at: t), board: board, clip: clip, toast: toast(at: t), guide: guide(at: t), lead: lead(at: t, capsule: capsule, nudge: nudge), trail: trailUp(at: t), avoid: texts, bottomInset: bottomInset, nudge: nudge, tags: tags)
    }

    /// What the pill and its bubble say at `t`. The bubble carries every word the pill has to say: his words while
    /// he holds the key and while it thinks, each sentence as it is said, and a failure's reason.
    func capsule(at t: Double) -> CapsulePicture {
        let m = tokens.motion
        let grown = { (since: Double) in self.still ? 1 : self.arriving(since: since, at: t) }
        // A line said without being asked is the nudge card's (`SceneNudge.swift`): the capsule stays at rest for it.
        guard let hold = holds.last(where: { $0.down <= t }) else {
            // Before the first press a failure still shows: a grant not given, or the mind not running.
            if let failed, t >= failed.at { return CapsulePicture(look: .failed, open: grown(failed.at), words: [], note: failed.detail, bubble: grown(failed.at)) }
            return CapsulePicture(look: .rest, open: 0, words: [], note: nil)
        }
        func open(_ look: Look, _ words: [Word] = [], _ note: String? = nil, of ask: String? = nil) -> CapsulePicture {
            CapsulePicture(look: look, open: grown(hold.down), words: words, note: note, bubble: grown(hold.down), ask: ask)
        }
        // While it closes after an answer it is still that answer's, so what leads to it can go back with it. The
        // bubble goes in less time than the pill takes to shut.
        func rest(since: Double, of ask: String? = nil) -> CapsulePicture {
            let open = still ? 0 : 1 - leaving(since: since, at: t)
            let bubble = still ? 0 : 1 - tokens.curves.leave((t - since) / max(ms(tokens.bubble.leaveMs), 1))
            var resting = CapsulePicture(look: .rest, open: open, words: [], note: nil, bubble: bubble, ask: open > 0 ? ask : nil)
            // The bubble keeps the words it held while it goes.
            if bubble > 0 {
                let before = capsule(at: since - 1)
                resting.words = before.words.map { Word(text: $0.text, bright: 1) }
            }
            return resting
        }
        if let closed = closedAt, closed >= hold.down, t >= closed { return rest(since: closed) }
        // A failure since this press shows at once, while the key is still down too, and stays until the next press.
        if let failed, failed.at >= hold.down, t >= failed.at { return open(.failed, [], failed.detail) }
        // His words: one still being heard is in stone, and in ink once it has settled.
        let his = heard.filter { $0.at <= t }
        guard let up = hold.up, t >= up else {
            var listening = open(.listening, his.map { Word(text: $0.word, bright: t - $0.at < m.wordMs ? tokens.dim : 1) }, his.isEmpty ? tokens.strings.listening : nil)
            listening.caret = still || Int(((t - hold.down) / max(ms(tokens.bubble.caretMs), 1)).rounded(.down)) % 2 == 0
            return listening
        }
        // While it thinks the bubble holds his words, all in ink and with no caret.
        let thinking = open(.thinking, his.map { Word(text: $0.word, bright: 1) }, tokens.strings.thinking)
        let done = idleAt.map { $0 >= up && $0 <= t } ?? false
        // The sentence whose words are up is the one being said, or the one before it while that still stands its time.
        if let ask = asks.last(where: { $0.beganAt >= hold.down && cards[$0.id] == nil }), let up = shown(ask).last(where: { $0.start <= t }), let now = times(ask).first(where: { $0.beat == up.beat }) {
            let said = ask.beats[now.beat]!
            // Once paral draws on the page for this ask, his question stays in the bubble as the reason for what is
            // drawn, until the answer's own words take it: a line said while he waits no longer does.
            if now.beat < 0, marks.contains(where: { $0.id == ask.id && $0.at <= t }) || boards.contains(where: { $0.id == ask.id && $0.at <= t }) { return thinking }
            if t < now.end { return open(.speaking, words(of: said, from: now, at: t), of: ask.id) }
            let whole = said.text.split(separator: " ").map { Word(text: String($0), bright: 1) }
            let more = ask.beats.keys.contains { $0 > now.beat }
            if more { return open(.speaking, whole, of: ask.id) }
            if !done { return now.beat < 0 ? thinking : open(.speaking, whole, of: ask.id) }
            let restAt = max(now.end, idleAt ?? now.end) + m.lingerMs
            return t < restAt ? open(.speaking, whole, of: ask.id) : rest(since: restAt, of: ask.id)
        }
        if done, let idle = idleAt { return rest(since: idle) }
        // No line of this hold has begun: the newest dim line sent while he talked stands under his words until one does.
        var waiting = thinking
        waiting.thought = thoughts.last { $0.at >= hold.down && $0.at <= up }?.text
        return waiting
    }

    /// Words step from dim to bright as they are said. Text never fades or slides.
    func words(of said: Beat, from now: BeatTime, at t: Double) -> [Word] {
        let all = said.text.split(separator: " ").map(String.init)
        let elapsed = (t - now.start) / 1000
        let through = (t - now.start) / max(now.end - now.start, 1)
        return all.enumerated().map { i, word in
            let saidYet = said.wordStart.count == all.count ? elapsed >= said.wordStart[i] : Double(i) < through * Double(all.count)
            return Word(text: word, bright: saidYet ? 1 : tokens.dim)
        }
    }

    /// How much of a stroke is inked at `t`, at even speed. The pointer flies to the stroke's start first, so the
    /// ink waits for it.
    private func inked(_ kind: MarkKind, since began: Double, at t: Double) -> Double {
        still ? 1 : Motion.even((t - began - flight) / duration(kind))
    }

    /// The ink on the page at `t`. Tags are drawn as chips (`tagsUp`).
    func marksUp(at t: Double) -> [MarkPicture] {
        marks.compactMap { mark in
            guard mark.kind != .tag, !stale(at: t), mark.at <= t, mark.clearedAt.map({ t < $0 }) ?? true, let began = start(mark), t >= began else { return nil }
            return MarkPicture(key: "\(mark.id)/\(mark.beat)", kind: mark.kind, box: mark.box, label: mark.label, drawn: inked(mark.kind, since: began, at: t), pulse: pulse(of: mark, since: began, at: t))
        }
    }

    /// His own loop, drawn back: the ring a line gets, a rounded box around several lines, or a ring that follows
    /// the loop's own box when it holds no whole line.
    func ring(for echo: Echo, drawn: Double) -> MarkPicture {
        if echo.shape == "ring" || echo.shape == "box" {
            return MarkPicture(key: "echo/\(echo.id)", kind: echo.shape == "box" ? .box : .ring, box: echo.box, label: nil, drawn: drawn)
        }
        let m = tokens.mark
        let w = max(echo.box.w / m.ringWide - 2 * m.pad, 1), h = max(echo.box.h / m.ringTall - 2 * m.pad, 1)
        let fitted = Box(x: echo.box.x + (echo.box.w - w) / 2, y: echo.box.y + (echo.box.h - h) / 2, w: w, h: h)
        return MarkPicture(key: "echo/\(echo.id)", kind: .ring, box: fitted, label: nil, drawn: drawn)
    }

    func echo(at t: Double) -> MarkPicture? {
        guard let echo = echoes.last(where: { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }) else { return nil }
        return ring(for: echo, drawn: inked(.ring, since: echo.at, at: t))
    }

    /// The kind of stroke an echo is drawn with, for the cursor's timing.
    func kind(of echo: Echo) -> MarkKind { echo.shape == "box" ? .box : .ring }

    func board(at t: Double) -> BoardPicture? {
        guard let board = boards.last(where: { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }) else { return nil }
        // A board that grows with its answer draws each row as that row's own sentence begins (`SceneBoards.swift`).
        if board.beats != nil {
            guard let up = grown(board, at: t) else { return nil }
            let coming = still ? 1 : tokens.curves.travel((t - up.newest) / max(ms(tokens.motion.usualMs), 1))
            let appear = still ? 1 : arriving(since: max(boardSince(board), up.first), at: t)
            return BoardPicture(id: board.id, rows: board.rows, shown: up.shown, appear: appear, filled: 1, room: place(of: board, at: t), now: board.now, coming: coming, growing: true, shape: board.shape, notes: notes(of: board, at: t))
        }
        let ask = asks.first { $0.id == board.id }
        let begun = ask.map { times($0).filter { $0.beat >= 0 && $0.start <= t }.count } ?? board.rows.count
        let over = ask.map { ask in times(ask).last.map { $0.end <= t && $0.beat == ask.beats.keys.max() } ?? false } ?? true
        // A board shown without being asked comes whole: nothing is spoken for its rows to keep step with.
        // A board of steps comes whole too: the step he is on may be its last row. So does a column: it is one chain.
        let shown = over || ask?.trail != nil || board.now != nil || board.shape == .column ? board.rows.count : min(board.rows.count, max(1, begun))
        // The card grows to hold a row as its sentence begins (`PainterBoard.swift`).
        let newest = ask.flatMap { ask in times(ask).filter { $0.beat >= 0 }.dropFirst(max(shown - 1, 0)).first?.start }
        let coming = still || shown == board.rows.count && over ? 1 : newest.map { tokens.curves.travel((t - $0) / max(ms(tokens.motion.usualMs), 1)) } ?? 1
        // It comes up once what came with it has arrived (`SceneOrder.swift`).
        let appear = still ? 1 : arriving(since: boardSince(board), at: t)
        // Until its rows have arrived the card is empty, whatever a later moment made of it.
        let rows = board.filledAt.map { t >= $0 } ?? true ? board.rows : []
        let filled = rows.isEmpty ? 0 : board.filledAt.map { still ? 1 : tokens.curves.travel((t - $0) / max(ms(tokens.motion.usualMs), 1)) } ?? 1
        return BoardPicture(id: board.id, rows: rows, shown: min(shown, rows.count), appear: appear, filled: filled, room: place(of: board, at: t), now: board.now, coming: coming, shape: board.shape, notes: notes(of: board, at: t))
    }

    /// The clip plays once from the moment its card is up, then holds its last frame.
    func clip(at t: Double) -> ClipPicture? {
        guard let clip = clips.last(where: { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }) else { return nil }
        let opening = still ? 0 : ms(tokens.motion.arriveMs)
        let played = min(max((t - clip.at - opening) / 1000, 0), max(clip.seconds - 1.0 / 30, 0))
        return ClipPicture(id: clip.id, path: clip.path, still: clip.still, second: (played * 30).rounded(.down) / 30, appear: still ? 1 : arriving(since: clip.at, at: t), room: clip.room)
    }

    func trailUp(at t: Double) -> [TrailPoint] {
        guard let hold = holds.last(where: { $0.down <= t }), hold.up.map({ t < $0 }) ?? true else { return [] }
        return trail.filter { $0.at >= hold.down && $0.at <= t }.compactMap { point in
            let alpha = 1 - tokens.curves.leave((t - point.at) / max(ms(tokens.motion.trailFadeMs), 1))
            return alpha > 0 ? TrailPoint(x: point.x, y: point.y, alpha: alpha) : nil
        }
    }
}
