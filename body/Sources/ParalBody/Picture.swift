import Foundation

public enum Look: String { case rest, listening, thinking, speaking, failed }

public struct Word: Equatable {
    public var text: String
    public var bright: Double
}

public struct CapsulePicture: Equatable {
    public var look: Look
    /// 0 is the resting circle, 1 the full capsule.
    public var open: Double
    public var words: [Word]
    /// The small tag while thinking, the placeholder while listening, or the reason it failed.
    public var note: String?
    /// At rest with paral's ink still on the page, the circle carries a cross that clears it.
    public var closes = false
    /// The steps paral took before a line it said without being asked, each lit once it is reached. Empty otherwise.
    public var trail: [Word] = []
}

public struct MarkPicture: Equatable {
    public var key: String
    public var kind: MarkKind
    public var box: Box
    public var label: String?
    /// How far the ink has gone along the pen's path, 0 to 1.
    public var drawn: Double
}

public struct BoardPicture: Equatable {
    public var id: String
    public var rows: [[String]]
    public var shown: Int
    public var appear: Double
    /// 0 while the card is empty; 0 to 1 as the rows that filled it come in; 1 for a board that arrived whole.
    public var filled: Double
    public var room: Box
}

public struct ClipPicture: Equatable {
    public var id, path, still: String
    /// Where the clip is in its own time, stepped to its frames so that a picture changes only when the clip does.
    public var second: Double
    public var appear: Double
    public var room: Box
}

public struct TrailPoint: Equatable { public var x, y, alpha: Double }

public struct PointerPicture: Equatable { public var x, y, alpha: Double }

/// Everything on screen at one moment, as plain values. The painter draws it; nothing else decides what is shown.
public struct Picture: Equatable {
    public var clock: Double
    public var capsule: CapsulePicture
    public var marks: [MarkPicture]
    /// A neat ring where he drew his own loop, until his next ask.
    public var echo: MarkPicture?
    public var pointer: PointerPicture?
    public var board: BoardPicture?
    public var clip: ClipPicture?
    public var trail: [TrailPoint]
    /// Where the page's own text is, so nothing written beside a mark lands on it.
    public var avoid: [Box]
}
