import AppKit

public struct Drawn: Equatable {
    public var what: String
    public var id: String?
    public var box: Box
}

func color(_ hex: String, alpha: Double = 1) -> CGColor {
    let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
    return CGColor(srgbRed: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255, alpha: alpha)
}

func inked(_ text: String, size: Double, color: CGColor, weight: NSFont.Weight = .regular, hand: Bool = false) -> NSAttributedString {
    let font = (hand ? NSFont(name: "Bradley Hand", size: size) : nil) ?? NSFont.systemFont(ofSize: size, weight: weight)
    return NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: NSColor(cgColor: color) ?? .black])
}

/// Draws a picture. It decides nothing about what is shown, only how it looks, and every size and colour is a token.
public struct Painter {
    public let tokens: Tokens
    public let width, height: Double
    let ink, paper: CGColor
    public let accent: CGColor
    let frames = ClipFrames()

    public init(tokens: Tokens, width: Double, height: Double) {
        self.tokens = tokens
        self.width = width
        self.height = height
        ink = color(tokens.ink)
        paper = color(tokens.paper)
        accent = color(tokens.accent)
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
        if let board = picture.board { drawn.append(Drawn(what: "board", id: board.id, box: self.board(board, clock: picture.clock, ctx))) }
        if let clip = picture.clip { drawn.append(Drawn(what: "clip", id: clip.id, box: self.clip(clip, ctx))) }
        if let pointer = picture.pointer { drawn.append(Drawn(what: "pointer", id: nil, box: self.pointer(pointer, ctx))) }
        drawn.append(Drawn(what: "capsule", id: nil, box: capsule(picture.capsule, clock: picture.clock, ctx)))
        return drawn
    }
}
