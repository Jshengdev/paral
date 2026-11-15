import AppKit

public struct Drawn: Equatable {
    public var what: String
    public var id: String?
    public var box: Box
    /// For a board: the size its words were drawn at, in points, which is the tokens' size times the card's shrink.
    public var type: Double?
    /// For a mark and for a drawn arrow: the points the pen has inked so far, in the order it draws them.
    public var path: [CGPoint]?
}

func color(_ hex: String, alpha: Double = 1) -> CGColor {
    let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
    return CGColor(srgbRed: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255, alpha: alpha)
}

/// Draws a picture. It decides nothing about what is shown, only how it looks, and every size and colour is a token.
public struct Painter {
    public let tokens: Tokens
    public let width, height: Double
    let ink, paper, ember, cardinal, light, mist: CGColor
    public let accent: CGColor
    let frames = ClipFrames()
    let ways = LeadWays()
    let nudges = NudgePlaces()
    let faces: Faces
    /// How much of the display's foot the Dock takes in the picture being painted, and the height left above it:
    /// the capsule and what sits beside it at the bottom are laid out above the Dock.
    var inset = 0.0
    /// The guide's card and the arrow that leads to it are left out: still placed, so the rest keeps off them and
    /// the card is named in what is given back, but not drawn. The app's overlay paints so, and paints them in a
    /// window of their own that a recording leaves out (`guide(of:placed:into:)`). A film paints everything.
    public var leavesOutGuide = false
    /// What the guide's card keeps off, besides the page's words.
    static let underGuide = ["board", "clip", "way", "toast", "mark", "echo", "chip"]
    var floor: Double { height - inset }

    public init(tokens: Tokens, width: Double, height: Double) {
        self.tokens = tokens
        self.width = width
        self.height = height
        ink = color(tokens.ink)
        paper = color(tokens.paper)
        accent = color(tokens.accent)
        ember = color(tokens.ember)
        cardinal = color(tokens.cardinal)
        light = color(tokens.light)
        mist = color(tokens.mist)
        faces = Faces(family: tokens.font, optical: tokens.fontOptical)
    }

    /// The light surface every card and pill is made of, after the design kit's: a nearly solid light fill with a
    /// soft shadow, and a hairline edge in mist, so that on a white page it does not run into the page's own lines.
    func surface(_ shape: CGPath, _ ctx: CGContext) {
        // A band of the surface's own colour outside its edge, so that no letter of the page touches the edge.
        if tokens.band > 0 {
            ctx.addPath(shape)
            ctx.setStrokeColor(light.copy(alpha: 0.92) ?? light)
            ctx.setLineWidth(2 * tokens.band)
            ctx.strokePath()
        }
        ctx.saveGState()
        ctx.setShadow(offset: .zero, blur: tokens.shadow, color: CGColor(gray: 0, alpha: 0.28))
        ctx.addPath(shape)
        ctx.setFillColor(light.copy(alpha: tokens.glass) ?? light)
        ctx.fillPath()
        ctx.restoreGState()
        ctx.addPath(shape)
        ctx.setStrokeColor(mist)
        ctx.setLineWidth(1)
        ctx.strokePath()
    }

    /// The box round some points, or nothing for none.
    static func bounds(of points: [CGPoint]) -> Box? {
        guard let left = points.map(\.x).min(), let right = points.map(\.x).max(), let top = points.map(\.y).min(), let bottom = points.map(\.y).max() else { return nil }
        return Box(x: left, y: top, w: max(right - left, 1), h: max(bottom - top, 1))
    }

    /// Words in the look's typeface, ready to be measured and drawn.
    func inked(_ text: String, size: Double, color: CGColor, weight: NSFont.Weight = .regular) -> NSAttributedString {
        NSAttributedString(string: text, attributes: [.font: faces.face(size, weight), .foregroundColor: NSColor(cgColor: color) ?? .black])
    }

    /// The context's origin must be the display's top-left corner, y growing downward, one unit a point.
    public func paint(_ picture: Picture, into ctx: CGContext) -> [Drawn] {
        var lifted = self
        lifted.inset = picture.bottomInset
        return lifted.draw(picture, into: ctx)
    }

    private func draw(_ picture: Picture, into ctx: CGContext) -> [Drawn] {
        let before = NSGraphicsContext.current
        NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)
        defer { NSGraphicsContext.current = before }
        var drawn: [Drawn] = []
        if let box = trail(picture.trail, ctx) { drawn.append(Drawn(what: "trail", id: nil, box: box)) }
        if let echo = picture.echo, let ink = mark(echo, his: true, avoiding: picture.avoid, ctx) { drawn.append(Drawn(what: "echo", id: echo.key, box: ink.box)) }
        for mark in picture.marks {
            guard let ink = self.mark(mark, avoiding: picture.avoid, ctx) else { continue }
            drawn.append(Drawn(what: "mark", id: mark.key, box: ink.box, path: ink.inked))
            // An echo of the mark's edge is named too, with where it is just then, so a film's record says when a
            // mark waits for his click. (It is `pulse` there: `echo` is his own loop coming back.)
            if let echo = ink.echo, let far = Painter.bounds(of: echo) { drawn.append(Drawn(what: "pulse", id: mark.key, box: far, path: echo)) }
        }
        // The tags by their lines, where the scene placed them; every card placed below keeps off them.
        drawn += tags(picture.tags, ctx)
        if let board = picture.board {
            let placed = self.board(board, clock: picture.clock, ctx)
            drawn.append(Drawn(what: "board", id: board.id, box: placed.card, type: placed.type))
            // The lit row of a board of steps is named too, with its number, so a film's record says which step is lit.
            if let now = board.now, let lit = placed.lit { drawn.append(Drawn(what: "step", id: "\(board.id)/\(now)", box: lit)) }
        }
        if let clip = picture.clip { drawn.append(Drawn(what: "clip", id: clip.id, box: self.clip(clip, ctx))) }
        var pointer = picture.pointer
        // The arrow keeps off the page's text and off whatever card is up, so it is placed once those are drawn. Only
        // then is it known where a cursor that is with the arrow is.
        if let way = picture.way {
            let cards = drawn.filter { ["board", "clip", "chip"].contains($0.what) }.map(\.box)
            let place = self.place(way, avoiding: picture.avoid + cards)
            self.way(way, at: place, ctx)
            drawn.append(Drawn(what: "way", id: way.id, box: place.whole))
            drawn.append(Drawn(what: "way-tag", id: place.name.string, box: Box(x: place.pill.minX, y: place.pill.minY, w: place.pill.width, h: place.pill.height)))
            // Its button takes a click once it has arrived, as the nudge card's do (`Overlay.hits`).
            if way.button >= 1 { drawn.append(Drawn(what: "button", id: ScrollButton.button, box: Box(x: place.button.minX, y: place.button.minY, w: place.button.width, h: place.button.height))) }
            if let with = pointer {
                let tip = self.tip(of: with, with: way, at: place)
                pointer?.x = tip.x
                pointer?.y = tip.y
            }
        }
        // The toast keeps off the text, the cards and the arrow, so it comes after them.
        if let toast = picture.toast {
            let up = drawn.filter { ["board", "clip", "way", "chip"].contains($0.what) }.map(\.box)
            let made = self.toast(toast, avoiding: picture.avoid + up, ctx)
            drawn.append(Drawn(what: "toast", id: nil, box: made.place))
            // Its badge is named too, at the size it has just then and with as much of its tick as is drawn.
            drawn.append(Drawn(what: "badge", id: nil, box: made.badge, path: made.tick))
        }
        // The guide's card keeps off everything else, so it is placed last of the things that are placed.
        if let guide = picture.guide {
            let up = drawn.filter { Painter.underGuide.contains($0.what) }.map(\.box)
            ctx.saveGState()
            if leavesOutGuide { ctx.clip(to: CGRect.zero) }
            let card = self.guide(guide, avoiding: picture.avoid + up, ctx)
            ctx.restoreGState()
            drawn.append(Drawn(what: "guide", id: nil, box: card.card))
            // Its lines are named too, each where it is just then, so a film's record says how the card came up.
            for (index, line) in card.lines.enumerated() { drawn.append(Drawn(what: "line", id: "guide/\(index)", box: line)) }
        }
        // The nudge card keeps off the page's words and every card placed so far, so it comes after them.
        var spoken = picture.capsule
        if let nudge = picture.nudge {
            let up = drawn.filter { ["board", "clip", "way", "toast", "guide", "chip"].contains($0.what) }.map(\.box)
            let card = self.nudge(nudge, avoiding: picture.avoid, taken: up, marks: picture.marks + (picture.echo.map { [$0] } ?? []), tags: picture.tags, cursor: picture.pointer != nil, ctx)
            // Where no place is clear of the page's words its line is shown in the capsule, as it was before the card.
            if card.isEmpty { spoken = CapsulePicture(look: .speaking, open: min(nudge.coming.card, 1 - nudge.coming.gone), words: nudge.words, note: nil, bubble: min(nudge.coming.card, 1 - nudge.coming.gone), trail: nudge.trail, ask: nudge.id, orb: picture.capsule.orb) }
            drawn += card
        }
        // The cursor stays on the display: where its mark or its arrow runs to an edge, it stops short of the edge.
        pointer = pointer.map(inside)
        // The arrow from a mark to what speaks about it keeps off every other piece, so it is found a way last.
        var with = picture
        with.pointer = pointer
        if !(leavesOutGuide && picture.lead?.to == .guide), let lead = lead(with, placed: drawn, ctx) { drawn.append(lead) }
        // The rings of his click lie under the cursor.
        if let click = picture.click { drawn.append(Drawn(what: "click", id: nil, box: self.click(click, ctx))) }
        if let pointer {
            let cursor = self.pointer(pointer, clock: picture.clock, ctx)
            drawn.append(Drawn(what: "pointer", id: nil, box: cursor.box))
            if let tag = cursor.tag { drawn.append(Drawn(what: "tag", id: nil, box: tag)) }
        }
        let pill = capsule(spoken, avoiding: picture.avoid, ctx)
        if spoken.ask != nil, spoken.ask == picture.nudge?.id { drawn.append(Drawn(what: "nudge-in-capsule", id: spoken.ask, box: pill.box)) }
        drawn.append(Drawn(what: "capsule", id: nil, box: pill.box))
        // The cross is named too, since it takes a click, as the nudge card's buttons do (`Overlay` takes both lists);
        // and the bubble, which carries the pill's words.
        if let cross = pill.cross { drawn.append(Drawn(what: "cross", id: nil, box: cross)) }
        if let bubble = pill.bubble { drawn.append(Drawn(what: "bubble", id: nil, box: bubble)) }
        // The orb's square of light, while it is drawn: the overlay draws only that square again while nothing else moves.
        if let orb = pill.orb { drawn.append(Drawn(what: "orb", id: nil, box: orb)) }
        return drawn
    }
}
