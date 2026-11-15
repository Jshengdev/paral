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
    /// 0 is the pill shut into the orb, 1 the full pill.
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
    /// At rest with paral's ink still on the page, a cross that clears it sits beside the orb.
    public var closes = false
    /// The steps paral took before a line it said without being asked, each lit once it is reached. Empty otherwise.
    public var trail: [Word] = []
    /// The ask whose words the capsule holds, while it holds any and while it closes after them.
    public var ask: String?
    /// The orb the pill shuts into, while the pill is not fully open (`SceneOrb.swift`). Nil while it is.
    public var orb: OrbPicture? = nil
}

public struct MarkPicture: Equatable {
    public var key: String
    public var kind: MarkKind
    public var box: Box
    public var label: String?
    /// How far the ink has gone along the pen's path, 0 to 1.
    public var drawn: Double
    /// How far through one echo of its edge it is, 0 to 1, or nil for none. Only the mark of a walk's step sends
    /// out echoes, while it waits for his click.
    public var pulse: Double?
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
    /// How far the card has grown to hold the newest of its `shown` rows, 0 to 1: the card is as tall as the rows it shows.
    public var coming = 1.0
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
    /// How far its "Scroll for me" button has come, 0 to 1: it comes once the arrow is inked, and takes a click at 1.
    public var button = 1.0
}

/// The toast that confirms something paral did: its words, how strong it is, 0 to 1, how it has come up as a card,
/// how far its badge has popped out (0 to 1, and a little past on the way) and how much of its tick is drawn, 0 to 1.
public struct ToastPicture: Equatable {
    public var text: String
    public var appear: Double
    public var coming: CardArrival
    public var badge, tick: Double
}

/// How a card stands at one moment: how far the card itself has come up, 0 to 1; how far it has gone again, 0 to
/// 1; and how far each of its lines has come up, in order, 0 to 1.
public struct CardArrival: Equatable {
    public var card, gone: Double
    public var lines: [Double]
}

/// The guide's card: what to do next, which step it is of how many, how strong the card is, 0 to 1, and how it and
/// its two lines (the name, then the words) have come up.
public struct GuidePicture: Equatable {
    public var text: String
    public var n, of: Int?
    public var appear: Double
    public var coming: CardArrival
}

/// The two buttons of the nudge card: its offer's ("Add to calendar" for a date that can be kept), and "Not now".
public enum NudgeButton: String { case add, notNow }

/// The nudge card: a line said without being asked, the steps paral took to it, and its two buttons when its date
/// can be kept. Its place is the painter's (`Layout.nudge`); the scene says only which line it sits beside.
public struct NudgePicture: Equatable {
    /// The ask the line belongs to: a mark with the same id is the line it is about.
    public var id: String
    public var text: String
    /// The message's words: each is in stone until it is said and in ink once it has been, when the line has a
    /// voice; a line shown and not spoken is in ink at once.
    public var words: [Word]
    /// The steps paral took, each lit once it is reached.
    public var trail: [Word]
    /// What its primary button says and sends, when it has buttons ("Not now" is the other); nil for none.
    public var offer: Offer?
    /// The box of the line it is about, or nil when the look sent the way to it and no mark.
    public var beside: Box?
    /// How it stands, as any card does: how far it has come up and gone, and each of its lines (the name and the
    /// trail, the message, the buttons). A card that is going offers no buttons.
    public var coming: CardArrival
    /// The button he pressed, while the card waits for what it asked (the date to be opened). It is drawn held and
    /// the card offers no buttons meanwhile, so one press asks once.
    public var answered: NudgeButton?
    /// The button held down just then. Only the window sets it, while the mouse is down on that button.
    public var held: NudgeButton? = nil
}

/// The drawn arrow that leads from the mark that matters to the card that is speaking about it.
public struct LeadPicture: Equatable {
    /// The guide's card or the nudge card. The pill and its bubble are never led to.
    public enum Speaker: Equatable { case guide, nudge }
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
    public struct WithWay: Equatable { public var flight, aside: Double; public var back = 0.0 }
    /// It wears its name tag while it comes in from nowhere, so he can tell whose cursor is moving. The tag pops
    /// out as the cursor comes: `tagGrown` is how far, 0 to 1 and a little past on the way.
    public var tag = false
    public var tagGrown = 1.0
    /// How large it is drawn against its own size: 1, but for a moment at his click, when it presses.
    public var press = 1.0
    /// It says paral is working, while the capsule says so, by breathing: `working` is how far it has swollen, 0 to 1.
    public var thinking = false
    public var working = 0.0
    /// Set while it follows his own pointer, or flies back to it: what is laid out does not keep off it. With the way
    /// arrow, `back` is how far it has flown from beside the arrow toward `x`, `y`, beside his pointer, 0 to 1.
    public var follows = false
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
    /// The rings of his click on a mark that waited for it, for a moment after it.
    public var click: ClickPicture?
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
    /// The nudge card, while a line said without being asked is up.
    public var nudge: NudgePicture? = nil
    /// The tags by their lines, each a chip of a few words (`SceneTag.swift`).
    public var tags: [TagPicture] = []
}
