import Foundation

/// The look, in one file a designer can swap: colour, type, line widths, corners and motion times.
public struct Tokens: Codable {
    /// The voice pill, after the design kit's: open it is `width` by `height`, with a stop control, the wave and a
    /// send control of `control` across, `pad` in from its edge and `gap` apart, its foot `bottom` above the Dock.
    /// At rest it is shut into the orb (`orb`); with paral's ink on the page the cross of `restClose` sits beside
    /// the orb. The stop square, its corner and the send arrow's line; `face`, the logo mark that breathes by the
    /// pill while paral works and no cursor is on the page. `type` is the bubble's words, `tagType` the trail's.
    public struct Capsule: Codable {
        public var restClose, width, height, radius, bottom, pad, gap, control, type, tagType: Double
        public var stopSquare, stopCorner, arrowLine, face, labelPadX, labelPadY: Double
    }
    /// The pill's wave, after the kit's: `width` by `height`, one sample every `sampleMs` at a `pitch` apart, each a
    /// dot of `dot` (a level under `quiet`, drawn at `quietInk`), a bar `bar` by `short` (under `loud`) or `bar` by
    /// `tall`, fading over `fade` of its width at each end. Still, it is `idleDots` dots in ink at `idleInk`.
    public struct Wave: Codable { public var width, height, pitch, dot, bar, short, tall, quiet, loud, quietInk, idleDots, idleInk, fade, sampleMs: Double }
    /// The bubble above the pill that carries its words, after the kit's transcript bubble: the room inside it, its
    /// corner, its gap above the pill, its widest, the height of a line as a share of the type, the caret's size,
    /// its gap after the words and its blink, how far the bubble rises as it comes, and how soon it goes.
    public struct Bubble: Codable { public var padX, padY, radius, gap, maxWidth, leading, caretWidth, caretHeight, caretGap, caretMs, rise, leaveMs: Double }
    public struct Mark: Codable {
        public var width, pad, ringMs, lineMs, bracketMs, overshoot, wobble, ringWide, ringTall, labelType: Double
        /// A drawn arrow is two strokes, each at even speed: how long the pen takes over its shaft, then over its head.
        public var shaftMs, headMs: Double
        /// The box that hugs a line is the kit's highlight: a thinner edge than the hand-drawn ring, and a faint wash of its colour inside.
        public var boxWidth, wash: Double
        /// The room the box leaves round the line it hugs, across and up and down, where the page has that much
        /// room; and how round its corners are.
        public var boxPadX, boxPadY, boxRadius: Double
        /// The mark of a walk's step sends out an echo of its edge while it waits for his click, as the design kit's
        /// highlight does: how long after the edge is drawn the first sets off, how often one follows another, how
        /// much larger than the mark it grows (a share of the mark's size), and how strong it is when it sets off.
        public var echoAfterMs, echoEveryMs, echoGrows, echoStrength: Double
        /// A tick left of a line and a strike through it, each inked at even speed: the pen's time over each, how far
        /// the tick keeps from the line's first word and the tallest it is drawn, how far a strike runs past each end.
        public var tickMs, strikeMs, tickGap, tickMost, strikePast: Double
    }
    /// A tag, a chip of a few words that belongs to a line (`PainterTag.swift`, `LayoutTag.swift`): the size of its
    /// words, the room round them, the width of a date's edge; how far after the line's ink it sits, how far above the
    /// line when there is no room after it, and how far it keeps from the page's words; how small it is when it pops
    /// out, as a share of its size, and how long that takes.
    public struct Chip: Codable { public var type, padX, padY, edge, gap, above, clear, from, ms: Double }
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
        /// At his click on a mark that waits for it: how small the cursor presses, as a share of its size; how long
        /// the two rings take to spread to rest; and how long they rest before they go.
        public var pressTo, clickMs, clickStayMs: Double
        /// Beside his own pointer (`SceneFollow.swift`): how far right of and below its tip, how long the chase takes,
        /// how long it stays by what it drew before it flies back, and how far and how often a sight of it is kept.
        public var followX, followY, followMs, stayMs, followLeast, followEveryMs: Double
    }
    public struct Board: Codable { public var pad, boxPadX, boxPadY, gap, rowGap, downGap, type, wordsType, radius, maxWidth, margin, emptyWidth, emptyHeight, stripWidth, stripHeight, stripTop, stripInk: Double }
    public struct Motion: Codable {
        public var tempo, lingerMs, wordMs, trailFadeMs, readMsAWord, readMsLeast, flightMs, arc: Double
        /// How long a thing takes to arrive, how long to leave (less: what goes is gone sooner than it came), and how
        /// long the usual small change takes (a card growing to hold its rows, the cursor's tag popping out).
        public var arriveMs, leaveMs, usualMs: Double
        /// How long a press down takes.
        public var pressMs: Double
        /// One thing at a time (`SceneOrder.swift`): the gap after the pointing before the card, after the card's
        /// words before the board, and after the board before the card's buttons.
        public var cardAfterMs, boardAfterMs, buttonsAfterMs: Double
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
        /// The button under the tag: its words, their size, the room round them and its gap below the tag.
        public var scroll: String; public var buttonType, buttonPadX, buttonPadY, buttonGap: Double
    }
    /// The toast that confirms something paral did, after the design kit's.
    public struct Toast: Codable {
        /// Its type size, the room round what is in it, and the gap between its badge and its words.
        public var type, pad, gap: Double
        /// How long it stays once it is up.
        public var stayMs: Double
        /// Its badge pops out a moment after the toast comes: how long after, and how small it is before, as a
        /// share of its size.
        public var badgeAfterMs, badgeFrom: Double
    }
    /// The guide's card, after the design kit's nudge: how wide it is, the room inside it, its corner, the size of
    /// its words and of the small line above them, the logo's width and the gap from it to the name, the gap between the two lines, and how far from
    /// the top and the side of the display it sits (the top clears the Mac's menu bar, 37 points on a notched display).
    public struct Guide: Codable { public var width, pad, radius, type, small, avatar, nameGap, gap, top, side: Double }
    /// How a card comes up and goes, after the design kit's cards: how small it is when it sets off, as a share of
    /// its size, and how far below its place; how far each of its lines rises into place; how long after the card
    /// its first line sets off, and each next line after the one before; and how small it gets as it goes.
    public struct Card: Codable { public var from, drop, rise, firstMs, nextMs, goneTo: Double }
    /// The arrow that leads from a mark to what speaks about it, after the design kit's drawn arrow: how wide its
    /// ink is, how far it stays from the mark and from what it leads to, how far its ink and paper edge keep from
    /// every read line of the page, and the longest it may be. Where no such way is found, none is drawn. The pen's
    /// time over it is `mark.shaftMs` and `mark.headMs`.
    public struct Lead: Codable { public var width, gap, clear, longest: Double }
    /// The nudge card, after the design kit's: a line said without being asked, with "Add to calendar" and "Not now"
    /// when its date can be kept. Its look, where it may go, and how it moves are all here (`PainterNudge.swift`).
    public struct Nudge: Codable {
        /// The card: how wide, the room inside, its corner, the space between its rows, the avatar's size and the gap
        /// after it, the size of the name, of the trail of steps under it and the gap above that, and of the message.
        public var width, pad, radius, gap, avatar, nameGap, nameType, trailType, trailGap, type: Double
        /// The pill buttons: the size of their words and the tracking, the room round the words, and the gap between two.
        public var buttonType, tracking, buttonPadX, buttonPadY, buttonGap: Double
        /// The buttons' words. The name and the trail are in the kit's `stone`.
        public var add, notNow: String
        /// Where it may go: how far it keeps from the page's words and from every other piece, how far beyond the
        /// text column it sits, how far from the display's side and from its top (below the menu bar), the step of
        /// the search for a free place, and the least it may be shrunk to and by how much at a time when no place is free.
        public var clear, beside, edge, top, cell, least, shrink: Double
        /// How long it takes to go (it comes up as any card does, `card`), and the size of a held button.
        public var leaveMs, pressed: Double
        /// After a press of its offer, the longest the card waits for the mind's answer before it goes by itself, so
        /// it never hangs. Chosen, not measured: the tapped calendar line was answered within a tenth of a second on a tape.
        public var answeredMs: Double
        /// Where the drawn arrow lands on the card's near end, as a share of its height from the top: the kit's
        /// newer pictures land it about a third of the way down.
        public var landing: Double
    }
    /// `opened` is what the toast says when a date has been opened in his calendar. It does not say "added": whether
    /// Calendar asks first or adds at once is not known.
    /// `name` is what the cursor's tag says: whose cursor it is.
    public struct Strings: Codable { public var thinking, listening, failed, opened, name, step: String
        /// `going`: the toast's word before the name of a USC page opened in his browser. `hold`: the label under the open pill, `{key}` as `keys` names the hold key.
        public var going, hold: String
        public var keys: [String: String]
    }

    public var ink, paper, accent: String
    /// The design kit's grey for a quiet line: the name above a card's words and the step's number; the words in
    /// the pill's bubble still to come (his words still being heard, an answer's words not yet said); the wave while
    /// paral answers.
    public var stone: String
    /// One dial over the sizes the design kit gives (the cursor and its tag, the guide's card, the nudge card, the
    /// toast, the highlight's box, the width of drawn ink, and the voice pill, its wave and its bubble): 1 is the kit's own size. The kit asks for one such scale and not
    /// for changed sizes. `load` gives the look with it already applied.
    public var scale: Double
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
    public var orb: Orb
    public var wave: Wave
    public var bubble: Bubble
    public var mark: Mark
    public var board: Board
    public var way: Way
    public var cursor: Cursor
    public var toast: Toast
    public var guide: Guide
    public var card: Card
    public var lead: Lead
    public var nudge: Nudge
    public var chip: Chip
    public var motion: Motion
    /// The four curves everything moves on (`Motion.swift`).
    public var curves: Curves
    public var strings: Strings

    public static func load(_ path: String) throws -> Tokens {
        try JSONDecoder().decode(Tokens.self, from: Data(contentsOf: URL(fileURLWithPath: path))).scaled()
    }

    /// The look as it is drawn: every size the design kit gives, times `scale`.
    func scaled() -> Tokens {
        var t = self
        let sizes: [WritableKeyPath<Tokens, Double>] = [
            \.cursor.size, \.cursor.gap, \.cursor.ripple, \.cursor.followX, \.cursor.followY,
            \.card.drop, \.card.rise,
            \.guide.width, \.guide.pad, \.guide.radius, \.guide.type, \.guide.small, \.guide.avatar, \.guide.nameGap, \.guide.gap,
            \.toast.type, \.toast.pad, \.toast.gap,
            \.mark.width, \.mark.boxWidth, \.mark.boxPadX, \.mark.boxPadY, \.mark.boxRadius, \.lead.width,
            \.capsule.width, \.capsule.height, \.capsule.radius, \.capsule.pad, \.capsule.gap, \.capsule.control, \.capsule.type,
            \.orb.size, \.capsule.stopSquare, \.capsule.stopCorner, \.capsule.arrowLine, \.capsule.face,
            \.wave.width, \.wave.height, \.wave.pitch, \.wave.dot, \.wave.bar, \.wave.short, \.wave.tall,
            \.bubble.padX, \.bubble.padY, \.bubble.radius, \.bubble.gap, \.bubble.maxWidth, \.bubble.caretWidth, \.bubble.caretHeight, \.bubble.caretGap, \.bubble.rise,
            \.nudge.width, \.nudge.pad, \.nudge.radius, \.nudge.gap, \.nudge.avatar, \.nudge.nameGap, \.nudge.nameType, \.nudge.trailType,
            \.nudge.trailGap, \.nudge.type, \.nudge.buttonType, \.nudge.tracking, \.nudge.buttonPadX, \.nudge.buttonPadY, \.nudge.buttonGap,
            \.chip.type, \.chip.padX, \.chip.padY, \.chip.edge,
        ]
        for size in sizes { t[keyPath: size] *= scale }
        t.scale = 1
        return t
    }
}
