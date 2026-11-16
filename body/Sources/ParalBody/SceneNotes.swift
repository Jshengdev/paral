import Foundation

/// A note on a board, as the wire carries it: the row it belongs to, its words, and the sentence it is written with,
/// which it has once that sentence has come.
public struct BoardNote: Equatable {
    public var row: Int
    public var says: String
    public var beat: Int?

    static func read(_ given: Any?) -> [BoardNote] {
        (given as? [[String: Any]] ?? []).compactMap { note in
            guard let row = (note["row"] as? NSNumber)?.intValue, row >= 0, let says = note["says"] as? String, !says.isEmpty else { return nil }
            return BoardNote(row: row, says: says, beat: (note["beat"] as? NSNumber)?.intValue)
        }
    }
}

/// A note as it is drawn at one moment: its row, all its words (the card keeps room for them from the start), how
/// many of their letters are written so far, and whether paral's pointer is at the end of the writing just then.
public struct NotePicture: Equatable {
    public var row: Int
    public var says: String
    public var written: Int
    public var riding: Bool
}

extension Scene {
    /// A board's notes at `t`. A note is written by paral's pointer, `board.noteLettersASecond` letters a second,
    /// from `board.noteAfterMs` after the sentence it comes with has begun; before that none of it is. The pointer
    /// rides the writing from its first letter until `board.noteStayMs` after its last.
    func notes(of board: Board, at t: Double) -> [NotePicture] {
        guard !board.notes.isEmpty else { return [] }
        let said = asks.first { $0.id == board.id }.map { times($0) } ?? []
        return board.notes.map { note in
            guard let start = note.beat.flatMap({ beat in said.first { $0.beat == beat }?.start }) else { return NotePicture(row: note.row, says: note.says, written: 0, riding: false) }
            let all = Double(note.says.count), pace = max(tokens.board.noteLettersASecond, 0.1), from = start + ms(tokens.board.noteAfterMs)
            if still { return NotePicture(row: note.row, says: note.says, written: note.says.count, riding: false) }
            let letters = min(max(((t - from) / 1000 * pace).rounded(.down), 0), all)
            let whole = from + all / pace * 1000
            return NotePicture(row: note.row, says: note.says, written: Int(letters), riding: t >= from && t <= whole + ms(tokens.board.noteStayMs))
        }
    }
}
