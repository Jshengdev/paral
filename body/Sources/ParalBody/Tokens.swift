import Foundation

/// The look, in one file a designer can swap: colour, type, line widths, corners and motion times.
public struct Tokens: Codable {
    public struct Capsule: Codable { public var rest, restClose, width, height, radius, bottom, pad, type, tagType: Double }
    public struct Mark: Codable {
        public var width, pad, ringMs, lineMs, bracketMs, overshoot, wobble, ringWide, ringTall, labelType: Double
        /// The box that hugs a line is the kit's highlight: a thinner edge than the hand-drawn ring, and a faint wash of its colour inside.
        public var boxWidth, wash: Double
    }
    /// Paral's own cursor, after the design kit's.
    public struct Cursor: Codable {
        /// How tall it is, how wide its paper edge is, and how far from a mark it rests.
        public var size, edge, gap: Double
        /// How long it takes to step aside once its mark is drawn; then how far the ripple that says "here" spreads, and for how long.
        public var settleMs, ripple, rippleMs: Double
    }
    public struct Board: Codable { public var pad, boxPadX, boxPadY, gap, rowGap, type, radius, maxWidth, margin, emptyWidth, emptyHeight: Double }
    public struct Motion: Codable {
        public var tempo, openMs, lingerMs, wordMs, trailFadeMs, boardMs, readMsAWord, readMsLeast, flightMs, arc, bounce: Double
        /// For a line said without being asked: how long it stays after its reading time, and how long each step of its trail takes to light.
        public var unaskedStayMs, trailStepMs: Double
        public var reduce: Bool
    }
    /// The arrow that says which way to scroll, and the tag beside it that names what it leads to.
    public struct Way: Codable {
        /// The arrow: how far it runs toward the edge, how far it swings out from the tag before it turns, and how long each barb of its head is.
        public var tall, wide, head: Double
        /// The tag: its type size, the room round its words, the widest it may be, and the gap between it and the arrow.
        public var type, padX, padY, maxWidth, gap: Double
        /// How far from the display's edge it stays, and how wide the paper edge round the arrow's ink is (0 for none).
        public var edge, halo: Double
        /// How long the pen takes over the arrow; then how far a nod dips, how long one lasts, and the rest between two (0 for no nods).
        public var drawMs, nod, nodMs, nodEveryMs: Double
    }
    /// The toast that confirms something paral did, after the design kit's.
    public struct Toast: Codable {
        /// Its type size, the room round what is in it, and the gap between its badge and its words.
        public var type, pad, gap: Double
        /// How see-through its light fill is (the kit's 0.85), and how far its shadow spreads.
        public var glass, shadow: Double
        /// How long it stays once it is up.
        public var stayMs: Double
    }
    /// `opened` is what the toast says when a date has been opened in his calendar. It does not say "added": whether
    /// Calendar asks first or adds at once is not known.
    public struct Strings: Codable { public var thinking, listening, failed, opened: String }

    public var ink, paper, accent: String
    /// The typeface everything is written in (empty for the system's), and its optical size where it has one. The
    /// design kit writes everything in DM Sans at an optical size of 14.
    public var font: String
    public var fontOptical: Double
    /// The design kit's reds. Ember is for what is drawn by hand on the page (its ring and its arrow); cardinal for
    /// the neat box and for names; the cursor runs from deep cardinal through cardinal to ember.
    public var ember, cardinal, cardinalDeep: String
    /// The design kit's light surface, for a toast.
    public var light: String
    public var dim: Double
    public var capsule: Capsule
    public var mark: Mark
    public var board: Board
    public var way: Way
    public var cursor: Cursor
    public var toast: Toast
    public var motion: Motion
    public var strings: Strings

    public static func load(_ path: String) throws -> Tokens {
        try JSONDecoder().decode(Tokens.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
    }
}
