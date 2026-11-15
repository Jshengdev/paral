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
    /// On a board of steps, the row that is the step he is on, from 0. That row is lit.
    public var now: Int?
}

public struct ClipPicture: Equatable {
    public var id, path, still: String
    /// Where the clip is in its own time, stepped to its frames so that a picture changes only when the clip does.
    public var second: Double
    public var appear: Double
    public var room: Box
}

/// The arrow that says which way to scroll to reach what is on this page and not in view.
public struct WayPicture: Equatable {
    public var id: String
    public var down: Bool
    /// The name of what it leads to, written beside the arrow.
    public var toward: String
    /// How far the ink has gone along the arrow, 0 to 1.
    public var drawn: Double
    /// How far the arrow has dipped toward its edge, in points: 0 at rest, and for a moment more while it nods.
    public var nod: Double
}

/// The toast that confirms something paral did: its words, and how far it has come up or gone, 0 to 1.
public struct ToastPicture: Equatable {
    public var text: String
    public var appear: Double
}

/// The guide's card: what to do next, which step it is of how many, and how far the card has come up, 0 to 1.
public struct GuidePicture: Equatable {
    public var text: String
    public var n, of: Int?
    public var appear: Double
}

public struct TrailPoint: Equatable { public var x, y, alpha: Double }

/// Paral's own cursor: where its tip is, and how far the ripple that says "here" has spread, 0 to 1, or nil for none.
public struct PointerPicture: Equatable {
    public var x, y, alpha: Double
    public var ripple: Double?
    /// Set while the cursor is with the way arrow, whose place only the painter knows. `x` and `y` are then where it
    /// set off from; `flight` is how far it has flown to the arrow's tail, 0 to 1; once there it rides the arrow's
    /// pen; and `aside` is how far it has stepped aside to rest once the arrow is whole, 0 to 1.
    public var withWay: WithWay?
    public struct WithWay: Equatable { public var flight, aside: Double }
    /// It wears its name tag while it comes in from nowhere, so he can tell whose cursor is moving.
    public var tag = false
    /// It wears the orb that says paral is working, while the capsule says so.
    public var thinking = false
}

/// Everything on screen at one moment, as plain values. The painter draws it; nothing else decides what is shown.
public struct Picture: Equatable {
    public var clock: Double
    public var capsule: CapsulePicture
    public var marks: [MarkPicture]
    /// A neat ring where he drew his own loop, until his next ask.
    public var echo: MarkPicture?
    public var way: WayPicture?
    public var pointer: PointerPicture?
    public var board: BoardPicture?
    public var clip: ClipPicture?
    public var toast: ToastPicture?
    public var guide: GuidePicture?
    public var trail: [TrailPoint]
    /// Where the page's own text is, so nothing written beside a mark lands on it.
    public var avoid: [Box]
}
