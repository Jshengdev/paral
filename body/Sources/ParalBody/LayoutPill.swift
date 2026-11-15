import CoreGraphics
import Foundation

/// Where the voice pill and its bubble go, in points from the display's top-left corner. `height` is the floor the
/// pill stands on: the display's foot, or the Dock's top.
extension Layout {
    /// The pill's own box. `open` 0 is the collapsed pill, 1 the full one, and between them one capsule changes size:
    /// the two share their foot, `bottom` above the floor. With `closes` the rest is the cross instead, centred where
    /// the full pill's middle is, which is where the window takes a click on it. At rest it is at the display's
    /// middle; open, its middle across the display is `middle` (the display's middle when none is given), and it
    /// slides there as it opens.
    public static func pill(open: Double, closes: Bool = false, middle: Double? = nil, width: Double, height: Double, tokens: Tokens) -> Box {
        let c = tokens.capsule
        let rest = closes ? (w: c.restClose, h: c.restClose) : (w: c.collapsedWidth, h: c.collapsedHeight)
        let w = rest.w + (min(c.width, width - 48) - rest.w) * open
        let h = rest.h + (c.height - rest.h) * open
        let full = height - c.bottom - c.height / 2
        let resting = closes ? full : height - c.bottom - rest.h / 2
        let y = resting + (full - resting) * open
        let x = width / 2 + ((middle ?? width / 2) - width / 2) * open
        return Box(x: x - w / 2, y: y - h / 2, w: w, h: h)
    }

    /// The room above the full pill that its bubble may take at most: its widest, two lines of words tall, and
    /// taller by `trail` when it carries the steps of a line said without being asked.
    public static func bubbleRoom(over pill: Box, trail: Double = 0, tokens: Tokens) -> Box {
        let b = tokens.bubble
        let h = 2 * tokens.capsule.type * b.leading + 2 * b.padY + trail
        return Box(x: pill.x + pill.w / 2 - b.maxWidth / 2, y: pill.y - b.gap - h, w: b.maxWidth, h: h)
    }

    /// Where the open pill's middle goes across the display, so that neither it nor the room above it for its bubble
    /// lies on the page's read text: the display's middle when that is clear, or else the nearest place along the
    /// floor that is, a step of 24 points at a time; where every place lies on some text, the one that lies on
    /// least. The cross at rest is not moved, since the window takes a click on it where it always is.
    public static func pillMiddle(texts: [Box], width: Double, height: Double, tokens: Tokens) -> Double {
        let home = width / 2, cell = 24.0
        let half = max(tokens.capsule.width, tokens.bubble.maxWidth) / 2 + tokens.band
        guard !texts.isEmpty, width / 2 - half > 0 else { return home }
        func covered(_ middle: Double) -> Double {
            let pill = pill(open: 1, middle: middle, width: width, height: height, tokens: tokens)
            return [pill, bubbleRoom(over: pill, tokens: tokens)].reduce(0) { sum, box in
                let b = box.grown(tokens.band)
                return sum + texts.reduce(0) { $0 + max(0, min(b.x + b.w, $1.x + $1.w) - max(b.x, $1.x)) * max(0, min(b.y + b.h, $1.y + $1.h) - max(b.y, $1.y)) }
            }
        }
        let steps = Int(((width / 2 - half) / cell).rounded(.down))
        var tries = [home]
        for step in stride(from: 1, through: steps, by: 1) {
            let away = Double(step) * cell
            tries += [home - away, home + away]
        }
        var best = (cost: Double.infinity, middle: home)
        for middle in tries {
            let cost = covered(middle)
            if cost == 0 { return middle }
            if cost < best.cost { best = (cost, middle) }
        }
        return best.middle
    }
}
