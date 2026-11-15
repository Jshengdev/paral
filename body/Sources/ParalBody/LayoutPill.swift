import CoreGraphics
import Foundation

/// Where the voice pill and its bubble go, in points from the display's top-left corner. `height` is the floor the
/// pill stands on: the display's foot, or the Dock's top.
extension Layout {
    /// The pill's own box, always at the bottom centre (the owner's word, 01:56: the pill is at the bottom, as the
    /// designer's pictures have it, and covers what is under it with its solid surface). `open` 0 is the collapsed
    /// pill, 1 the full one, and between them one capsule changes size: the two share their foot, `bottom` above the
    /// floor. With `closes` the rest is the cross instead, at the height of the full pill's middle.
    public static func pill(open: Double, closes: Bool = false, width: Double, height: Double, tokens: Tokens) -> Box {
        let c = tokens.capsule
        let rest = closes ? (w: c.restClose, h: c.restClose) : (w: c.collapsedWidth, h: c.collapsedHeight)
        let w = rest.w + (min(c.width, width - 48) - rest.w) * open
        let h = rest.h + (c.height - rest.h) * open
        let full = height - c.bottom - c.height / 2
        let resting = closes ? full : height - c.bottom - rest.h / 2
        let y = resting + (full - resting) * open
        return Box(x: (width - w) / 2, y: y - h / 2, w: w, h: h)
    }

    /// The room above the full pill that its bubble may take at most: its widest, two lines of words tall, and
    /// taller by `trail` when it carries the steps of a line said without being asked.
    public static func bubbleRoom(over pill: Box, trail: Double = 0, tokens: Tokens) -> Box {
        let b = tokens.bubble
        let h = 2 * tokens.capsule.type * b.leading + 2 * b.padY + trail
        return Box(x: pill.x + pill.w / 2 - b.maxWidth / 2, y: pill.y - b.gap - h, w: b.maxWidth, h: h)
    }

    /// The band across the foot of the display that is the pill's and its bubble's alone: from the top of the room
    /// the bubble may take above the full pill down to the floor, the display's whole width. Nothing else of paral's
    /// is placed in it (the way arrow, the toast, the board, the guide's card, the nudge card), after the designer's
    /// pictures, where the foot holds the pill and its bubble and nothing else.
    public static func foot(width: Double, height: Double, tokens: Tokens) -> Box {
        let top = bubbleRoom(over: pill(open: 1, width: width, height: height, tokens: tokens), tokens: tokens).y
        return Box(x: 0, y: top, w: width, h: height - top)
    }

    /// From where down the page's own ink at the foot is looked for, in points from the top: the top of the pill's
    /// band, less twice the surface's band. The scene is told of it; nothing is moved by it now (the pill stays at
    /// the bottom centre), and it is kept for an arrow to keep off a drawing.
    public static func inkFrom(width: Double, height: Double, tokens: Tokens) -> Double {
        foot(width: width, height: height, tokens: tokens).y - 2 * tokens.band
    }
}
