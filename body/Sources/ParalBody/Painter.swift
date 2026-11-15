import AppKit

public struct Drawn: Equatable {
    public var what: String
    public var id: String?
    public var box: Box
    /// For a board: the size its words were drawn at, in points, which is the tokens' size times the card's shrink.
    public var type: Double?
}

func color(_ hex: String, alpha: Double = 1) -> CGColor {
    let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
    return CGColor(srgbRed: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255, alpha: alpha)
}

/// Draws a picture. It decides nothing about what is shown, only how it looks, and every size and colour is a token.
public struct Painter {
    public let tokens: Tokens
    public let width, height: Double
    let ink, paper, ember, cardinal, cardinalDeep, light: CGColor
    public let accent: CGColor
    let frames = ClipFrames()
    let faces: Faces

    public init(tokens: Tokens, width: Double, height: Double) {
        self.tokens = tokens
        self.width = width
        self.height = height
        ink = color(tokens.ink)
        paper = color(tokens.paper)
        accent = color(tokens.accent)
        ember = color(tokens.ember)
        cardinal = color(tokens.cardinal)
        cardinalDeep = color(tokens.cardinalDeep)
        light = color(tokens.light)
        faces = Faces(family: tokens.font, optical: tokens.fontOptical)
    }

    /// Words in the look's typeface, ready to be measured and drawn.
    func inked(_ text: String, size: Double, color: CGColor, weight: NSFont.Weight = .regular) -> NSAttributedString {
        NSAttributedString(string: text, attributes: [.font: faces.face(size, weight), .foregroundColor: NSColor(cgColor: color) ?? .black])
    }

    /// The context's origin must be the display's top-left corner, y growing downward, one unit a point.
    public func paint(_ picture: Picture, into ctx: CGContext) -> [Drawn] {
        let before = NSGraphicsContext.current
        NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)
        defer { NSGraphicsContext.current = before }
        var drawn: [Drawn] = []
        if let box = trail(picture.trail, ctx) { drawn.append(Drawn(what: "trail", id: nil, box: box)) }
        if let echo = picture.echo, let box = mark(echo, avoiding: picture.avoid, ctx) { drawn.append(Drawn(what: "echo", id: echo.key, box: box)) }
        for mark in picture.marks {
            if let box = self.mark(mark, avoiding: picture.avoid, ctx) { drawn.append(Drawn(what: "mark", id: mark.key, box: box)) }
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
        if let pointer { drawn.append(Drawn(what: "pointer", id: nil, box: self.pointer(pointer, ctx))) }
        drawn.append(Drawn(what: "capsule", id: nil, box: capsule(picture.capsule, clock: picture.clock, ctx)))
        return drawn
    }
}
