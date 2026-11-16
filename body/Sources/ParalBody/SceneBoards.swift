import Foundation

extension Scene {
    /// Takes a `board` line. A board and a clip share one place, so whichever comes takes it.
    mutating func board(_ id: String, _ rows: [[String]], now: Int?, beats: [Int]?, shape: BoardShape? = nil, at: Double) {
        for i in clips.indices where clips[i].clearedAt == nil { clips[i].clearedAt = at }
        // A board for an ask whose empty card is open fills that card; it does not open a second one.
        if let open = boards.lastIndex(where: { $0.id == id && $0.clearedAt == nil && $0.rows.isEmpty }) {
            boards[open].rows = rows
            boards[open].now = now
            boards[open].filledAt = at
            boards[open].beats = beats
            boards[open].shape = shape
            return
        }
        // A board that grows with its answer comes again with the same rows and one more beat: it is the same card,
        // which now has one more row to draw when that sentence begins.
        if let beats, let growing = boards.lastIndex(where: { $0.id == id && $0.clearedAt == nil && $0.beats != nil && $0.rows == rows }) {
            boards[growing].beats = beats
            return
        }
        // The same rows coming again right after a clear are the same card: the next step of a walk, or a look
        // that moved the box with the page. It does not fade in a second time, and it stays where it is unless
        // the page has moved and put text where the card was.
        let same = boards.last { $0.rows == rows && $0.shape == shape && $0.clearedAt.map { at - $0 <= Scene.together } ?? false }
        let kept = same.flatMap { old in texts.contains { Scene.touch($0, old.room) } ? nil : old.room }
        boards.append(Board(id: id, rows: rows, now: now, at: at, upSince: same?.upSince ?? at, room: kept ?? Layout.room(texts: texts, width: width, height: floor, tokens: tokens, tall: shape == .column), beats: beats, shape: shape))
    }

    /// A board that grows with its answer (`beats`): how many of its rows are drawn at `t`, when the first of them
    /// came, and when the newest did. A row is drawn once the sentence it comes with has begun, and never before the
    /// row above it. Nil while none is: the card is not up before its first row's sentence begins.
    func grown(_ board: Board, at t: Double) -> (shown: Int, first: Double, newest: Double)? {
        guard let beats = board.beats, let ask = asks.first(where: { $0.id == board.id }) else { return nil }
        let said = times(ask)
        let starts = beats.prefix(board.rows.count).map { beat in said.first { $0.beat == beat }?.start }
        let begun = starts.prefix { $0.map { $0 <= t } ?? false }.compactMap { $0 }
        guard let first = begun.first, let newest = begun.last else { return nil }
        return (begun.count, first, newest)
    }

    /// Where a board's room is at `t`, with every drag of it by its strip up to then: each drag begins from where
    /// the one before left the board, and the board stays where the last left it. A board he has not touched is
    /// where it was placed. The place is the board's alone: the next answer's board is placed as boards always were.
    func place(of board: Board, at t: Double) -> Box {
        var now = (x: 0.0, y: 0.0), held = (x: 0.0, y: 0.0)
        for drag in drags where drag.id == board.id && drag.at <= t {
            if drag.began { held = now }
            now = (held.x + drag.dx, held.y + drag.dy)
        }
        return Box(x: board.room.x + now.x, y: board.room.y + now.y, w: board.room.w, h: board.room.h)
    }

    /// When the board of his newest ask was first drawn with a row on it, or nil while it is not up at `t`. A board
    /// the ask before left on the screen does not count: it stays only until the new one comes.
    func boardUp(at t: Double) -> Double? {
        guard let board = boards.last(where: { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }), !board.rows.isEmpty, board.at >= (holds.last?.down ?? 0) else { return nil }
        if board.beats != nil { return grown(board, at: t).map { max(boardSince(board), $0.first) } }
        let since = boardSince(board)
        return since <= t ? since : nil
    }
}
