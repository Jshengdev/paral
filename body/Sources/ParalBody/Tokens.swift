import Foundation

/// The look, in one file a designer can swap: colour, type, line widths, corners and motion times.
public struct Tokens: Codable {
    public struct Capsule: Codable { public var rest, restClose, width, height, radius, bottom, pad, type, tagType: Double }
    public struct Mark: Codable {
        public var width, pad, ringMs, lineMs, bracketMs, overshoot, wobble, ringWide, ringTall, labelType: Double
        /// A drawn arrow is two strokes, each at even speed: how long the pen takes over its shaft, then over its head.
        public var shaftMs, headMs: Double
        /// The box that hugs a line is the kit's highlight: a thinner edge than the hand-drawn ring, and a faint wash of its colour inside.
        public var boxWidth, wash: Double
        /// The mark of a walk's step breathes while it waits for his click: how far the glow round its ink reaches at
        /// the top of a breath, how strong the glow is then (a box's wash deepens to the same), and how long one
        /// breath lasts. The rest between two is the way arrow's (`way.nodEveryMs`): both say "this waits for you".
        public var breath, breathDeep, breathMs: Double
    }
    /// Paral's own cursor, after the design kit's: the logo mark.
    public struct Cursor: Codable {
        /// How large its square frame is, and how far from a mark it rests.
        public var size, gap: Double
        /// How long it takes to step aside once its mark is drawn; then how far the ripple that says "here" spreads, and for how long.
        public var settleMs, ripple, rippleMs: Double
        /// How small its name tag is when it pops out, as a share of its full size.
        public var tagFrom: Double
        /// While paral works the cursor breathes: how much larger it gets, as a share of its size, and how long each way takes.
        public var workGrows, workMs: Double
    }
    public struct Board: Codable { public var pad, boxPadX, boxPadY, gap, rowGap, type, radius, maxWidth, margin, emptyWidth, emptyHeight: Double }
    public struct Motion: Codable {
        public var tempo, lingerMs, wordMs, trailFadeMs, readMsAWord, readMsLeast, flightMs, arc: Double
        /// How long a thing takes to arrive, how long to leave (less: what goes is gone sooner than it came), and how
        /// long the usual small change takes (a card growing to hold its rows, the cursor's tag popping out).
        public var arriveMs, leaveMs, usualMs: Double
        /// For a line said without being asked: how long it stays after its reading time, and how long each step of its trail takes to light.
        public var unaskedStayMs, trailStepMs: Double
        /// How long a line stands, for each of its words, before another line may take its place in the capsule or on
        /// the guide's card; never less than `readMsLeast`.
        public var standMsAWord: Double
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
        /// How far a nod dips, how long one lasts, and the rest between two (0 for no nods). The pen's time over the
        /// arrow is `mark.shaftMs` and `mark.headMs`.
        public var nod, nodMs, nodEveryMs: Double
    }
    /// The toast that confirms something paral did, after the design kit's.
    public struct Toast: Codable {
        /// Its type size, the room round what is in it, and the gap between its badge and its words.
        public var type, pad, gap: Double
        /// How long it stays once it is up.
        public var stayMs: Double
    }
    /// The guide's card, after the design kit's nudge: how wide it is, the room inside it, its corner, the size of
    /// its words and of the small line above them, the logo's width, the gap between the two lines, and how far from
    /// the top and the side of the display it sits (the top clears the Mac's menu bar, 37 points on a notched display).
    public struct Guide: Codable { public var width, pad, radius, type, small, avatar, gap, top, side: Double }
    /// The arrow that leads from a mark to what speaks about it, after the design kit's drawn arrow: how wide its
    /// ink is, how far it stays from the mark and from what it leads to, how far its ink and paper edge keep from
    /// every read line of the page, and the longest it may be. Where no such way is found, none is drawn. The pen's
    /// time over it is `mark.shaftMs` and `mark.headMs`.
    public struct Lead: Codable { public var width, gap, clear, longest: Double }
    /// `opened` is what the toast says when a date has been opened in his calendar. It does not say "added": whether
    /// Calendar asks first or adds at once is not known.
    /// `name` is what the cursor's tag says: whose cursor it is.
    public struct Strings: Codable { public var thinking, listening, failed, opened, name, step: String }

    public var ink, paper, accent: String
    /// The typeface everything is written in (empty for the system's), and its optical size where it has one. The
    /// design kit writes everything in DM Sans at an optical size of 14.
    public var font: String
    public var fontOptical: Double
    /// The design kit's reds. Ember is for what is drawn by hand on the page (its ring and its arrow, and his own
    /// loop); cardinal for the neat box, for names and for the logo mark.
    public var ember, cardinal: String
    /// The design kit's light surface, for every card, pill and tag.
    public var light: String
    /// The design kit's quiet grey, for a box on the board that is not the step he is on.
    public var mist: String
    /// The light surface of the capsule, the toast and the tags: how solid its fill is, and how far its soft shadow
    /// spreads. The kit fills at 0.85 over a blur of the page; the overlay cannot blur what is under it, so the fill
    /// is nearly solid, to keep the page's words from showing through the words written on it.
    public var glass, shadow: Double
    /// How wide the band of the surface's own colour is outside its edge: the page's letters stop short of the edge by this much.
    public var band: Double
    public var dim: Double
    public var capsule: Capsule
    public var mark: Mark
    public var board: Board
    public var way: Way
    public var cursor: Cursor
    public var toast: Toast
    public var guide: Guide
    public var lead: Lead
    public var motion: Motion
    /// The four curves everything moves on (`Motion.swift`).
    public var curves: Curves
    public var strings: Strings

    public static func load(_ path: String) throws -> Tokens {
        try JSONDecoder().decode(Tokens.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
    }
}
