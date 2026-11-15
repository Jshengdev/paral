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
    let faces: Faces
    /// How much of the display's foot the Dock takes in the picture being painted, and the height left above it:
    /// the capsule and what sits beside it at the bottom are laid out above the Dock.
    var inset = 0.0
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
            // A breath is named too, with how far its glow reaches just then, so a film's record says when a mark breathes.
            if mark.breath > 0 { drawn.append(Drawn(what: "breath", id: mark.key, box: ink.box.grown(tokens.mark.breath * mark.breath))) }
        }
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
            let cards = drawn.filter { $0.what == "board" || $0.what == "clip" }.map(\.box)
            let place = self.place(way, avoiding: picture.avoid + cards)
            self.way(way, at: place, ctx)
            drawn.append(Drawn(what: "way", id: way.id, box: place.whole))
            if let with = pointer {
                let tip = self.tip(of: with, with: way, at: place)
                pointer?.x = tip.x
                pointer?.y = tip.y
            }
        }
        // The toast keeps off the text, the cards and the arrow, so it comes after them.
        if let toast = picture.toast {
            let up = drawn.filter { ["board", "clip", "way"].contains($0.what) }.map(\.box)
            drawn.append(Drawn(what: "toast", id: nil, box: self.toast(toast, avoiding: picture.avoid + up, ctx)))
        }
        // The guide's card keeps off everything else, so it is placed last of the things that are placed.
        if let guide = picture.guide {
            let up = drawn.filter { ["board", "clip", "way", "toast", "mark", "echo"].contains($0.what) }.map(\.box)
            drawn.append(Drawn(what: "guide", id: nil, box: self.guide(guide, avoiding: picture.avoid + up, ctx)))
        }
        // The cursor stays on the display: where its mark or its arrow runs to an edge, it stops short of the edge.
        pointer = pointer.map(inside)
        // The arrow from a mark to what speaks about it keeps off every other piece, so it is found a way last.
        var with = picture
        with.pointer = pointer
        if let lead = lead(with, placed: drawn, ctx) { drawn.append(lead) }
        if let pointer {
            let cursor = self.pointer(pointer, clock: picture.clock, ctx)
            drawn.append(Drawn(what: "pointer", id: nil, box: cursor.box))
            if let tag = cursor.tag { drawn.append(Drawn(what: "tag", id: nil, box: tag)) }
        }
        let pill = capsule(picture.capsule, avoiding: picture.avoid, ctx)
        drawn.append(Drawn(what: "capsule", id: nil, box: pill.box))
        // The cross is named too, since it is the one thing on the overlay that takes a click; and the bubble, which carries the words.
        if let cross = pill.cross { drawn.append(Drawn(what: "cross", id: nil, box: cross)) }
        if let bubble = pill.bubble { drawn.append(Drawn(what: "bubble", id: nil, box: bubble)) }
        return drawn
    }
}
