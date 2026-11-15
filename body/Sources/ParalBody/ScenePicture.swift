import CoreGraphics
import Foundation

extension Scene {
    public func picture(at t: Double) -> Picture {
        let marks = marksUp(at: t), board = board(at: t), way = way(at: t)
        var capsule = capsule(at: t)
        var pointer = pointer(at: t)
        pointer?.thinking = capsule.look == .thinking
        if capsule.look == .thinking { pointer?.working = working(at: t) }
        let clip = clip(at: t)
        capsule.closes = capsule.look == .rest && (!marks.isEmpty || way != nil || board != nil || clip != nil)
        let nudge = nudge(at: t)
        return Picture(clock: t, capsule: capsule, marks: marks, echo: echo(at: t), way: way, pointer: pointer, board: board, clip: clip, toast: toast(at: t), guide: guide(at: t), lead: lead(at: t, capsule: capsule, nudge: nudge), trail: trailUp(at: t), avoid: texts, bottomInset: bottomInset, nudge: nudge)
    }

    func capsule(at t: Double) -> CapsulePicture {
        let m = tokens.motion
        let grown = { (since: Double) in self.still ? 1 : self.arriving(since: since, at: t) }
        // A line said without being asked is the nudge card's (`SceneNudge.swift`): the capsule stays at rest for it.
        guard let hold = holds.last(where: { $0.down <= t }) else {
            // Before the first press a failure still shows: a grant not given, or the mind not running.
            if let failed, t >= failed.at { return CapsulePicture(look: .failed, open: grown(failed.at), words: [], note: failed.detail) }
            return CapsulePicture(look: .rest, open: 0, words: [], note: nil)
        }
        func open(_ look: Look, _ words: [Word] = [], _ note: String? = nil, of ask: String? = nil) -> CapsulePicture {
            CapsulePicture(look: look, open: grown(hold.down), words: words, note: note, ask: ask)
        }
        // While it closes after an answer it is still that answer's, so what leads to it can go back with it.
        func rest(since: Double, of ask: String? = nil) -> CapsulePicture {
            let open = still ? 0 : 1 - leaving(since: since, at: t)
            return CapsulePicture(look: .rest, open: open, words: [], note: nil, ask: open > 0 ? ask : nil)
        }
        if let closed = closedAt, closed >= hold.down, t >= closed { return rest(since: closed) }
        // A failure since this press shows at once, while the key is still down too, and stays until the next press.
        if let failed, failed.at >= hold.down, t >= failed.at { return open(.failed, [], failed.detail) }
        guard let up = hold.up, t >= up else {
            let words = heard.filter { $0.at <= t }.map { Word(text: $0.word, bright: t - $0.at < m.wordMs ? 1 : 0.7) }
            return open(.listening, words, words.isEmpty ? tokens.strings.listening : nil)
        }
        let done = idleAt.map { $0 >= up && $0 <= t } ?? false
        // The sentence whose words are up is the one being said, or the one before it while that still stands its time.
        if let ask = asks.last(where: { $0.beganAt >= hold.down && $0.trail == nil }), let up = shown(ask).last(where: { $0.start <= t }), let now = times(ask).first(where: { $0.beat == up.beat }) {
            let said = ask.beats[now.beat]!
            if t < now.end { return open(.speaking, words(of: said, from: now, at: t), of: ask.id) }
            let whole = said.text.split(separator: " ").map { Word(text: String($0), bright: 1) }
            let more = ask.beats.keys.contains { $0 > now.beat }
            if more { return open(.speaking, whole, of: ask.id) }
            if !done { return now.beat < 0 ? open(.thinking, [], tokens.strings.thinking) : open(.speaking, whole, of: ask.id) }
            let restAt = max(now.end, idleAt ?? now.end) + m.lingerMs
            return t < restAt ? open(.speaking, whole, of: ask.id) : rest(since: restAt, of: ask.id)
        }
        if done, let idle = idleAt { return rest(since: idle) }
        return open(.thinking, [], tokens.strings.thinking)
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

    func marksUp(at t: Double) -> [MarkPicture] {
        marks.compactMap { mark in
            guard mark.at <= t, mark.clearedAt.map({ t < $0 }) ?? true, let began = start(mark), t >= began else { return nil }
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
        let ask = asks.first { $0.id == board.id }
        let begun = ask.map { times($0).filter { $0.beat >= 0 && $0.start <= t }.count } ?? board.rows.count
        let over = ask.map { ask in times(ask).last.map { $0.end <= t && $0.beat == ask.beats.keys.max() } ?? false } ?? true
        // A board shown without being asked comes whole: nothing is spoken for its rows to keep step with.
        // A board of steps comes whole too: the step he is on may be its last row.
        let shown = over || ask?.trail != nil || board.now != nil ? board.rows.count : min(board.rows.count, max(1, begun))
        let appear = still ? 1 : arriving(since: board.upSince, at: t)
        // Until its rows have arrived the card is empty, whatever a later moment made of it.
        let rows = board.filledAt.map { t >= $0 } ?? true ? board.rows : []
        let filled = rows.isEmpty ? 0 : board.filledAt.map { still ? 1 : tokens.curves.travel((t - $0) / max(ms(tokens.motion.usualMs), 1)) } ?? 1
        return BoardPicture(id: board.id, rows: rows, shown: min(shown, rows.count), appear: appear, filled: filled, room: board.room, now: board.now)
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
