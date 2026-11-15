import Foundation

public enum Look: String { case rest, listening, thinking, speaking, failed }

public struct Word: Equatable {
    public var text: String
    public var bright: Double
}

/// The voice pill and the bubble above it. A word at `bright` 1 is written in ink; below 1 it is still to come (his
/// word still being heard, or an answer's word not yet said) and is written in stone.
public struct CapsulePicture: Equatable {
    public var look: Look
    /// 0 is the collapsed pill (or the resting cross), 1 the full pill.
    public var open: Double
    public var words: [Word]
    /// What the bubble says when there are no words (the placeholder while listening, the tag while thinking), or
    /// the reason it failed.
    public var note: String?
    /// How far the bubble has come up out of the pill, 0 to 1: it rises with the pill and goes sooner than the pill shuts.
    public var bubble = 0.0
    /// The caret after his words while the key is held: whether it is shown at this moment of its blink. Nil for no caret.
    public var caret: Bool?
    /// The wave's samples, oldest first, each a level 0 to 1, and how far it has scrolled since the newest came in,
    /// as a share of one pitch. Empty for the still dots.
    public var wave: [Double] = []
    public var scrolled = 0.0
    /// While paral works and no cursor is on the page to breathe, the logo mark breathes by the pill: how far it has
    /// swollen, 0 to 1. Nil for none.
    public var working: Double?
    /// At rest with paral's ink still on the page, the circle carries a cross that clears it.
    public var closes = false
    /// The steps paral took before a line it said without being asked, each lit once it is reached. Empty otherwise.
    public var trail: [Word] = []
    /// The ask whose words the capsule holds, while it holds any and while it closes after them.
    public var ask: String?
}

public struct MarkPicture: Equatable {
    public var key: String
    public var kind: MarkKind
    public var box: Box
    public var label: String?
    /// How far the ink has gone along the pen's path, 0 to 1.
    public var drawn: Double
    /// How far into a breath it is, 0 to 1 and back. Only the mark of a walk's step breathes, while it waits for his click.
    public var breath = 0.0
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

/// The drawn arrow that leads from the mark that matters to what is speaking about it.
public struct LeadPicture: Equatable {
    /// The capsule, which is taller while it carries a trail of steps, or the guide's card.
    public enum Speaker: Equatable { case capsule(trail: Bool), guide }
    /// The key of the mark it leaves.
    public var from: String
    public var to: Speaker
    /// How far the ink has gone along it, 0 to 1.
    public var drawn: Double
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
    /// It wears its name tag while it comes in from nowhere, so he can tell whose cursor is moving. The tag pops
    /// out as the cursor comes: `tagGrown` is how far, 0 to 1 and a little past on the way.
    public var tag = false
    public var tagGrown = 1.0
    /// It says paral is working, while the capsule says so, by breathing: `working` is how far it has swollen, 0 to 1.
    public var thinking = false
    public var working = 0.0
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
    public var lead: LeadPicture?
    public var trail: [TrailPoint]
    /// Where the page's own text is, so nothing written beside a mark lands on it.
    public var avoid: [Box]
    /// How much of the display's foot the Dock takes, in points. What sits at the bottom is placed above it.
    public var bottomInset = 0.0
}
