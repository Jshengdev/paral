import CoreGraphics
import Foundation

/// Where the voice pill and its bubble go, in points from the display's top-left corner. `height` is the floor the
/// pill stands on: the display's foot, or the Dock's top.
extension Layout {
    /// The pill's own box. `open` 0 is the collapsed pill, 1 the full one, and between them one capsule changes size:
    /// the two share their foot, `bottom` above the floor. With `closes` the rest is the cross instead, at the height
    /// of the full pill's middle. At rest its middle across the display is `resting`, open it is `middle` (the
    /// display's middle where either is not given), and it slides from one to the other as it opens.
    public static func pill(open: Double, closes: Bool = false, middle: Double? = nil, resting across: Double? = nil, width: Double, height: Double, tokens: Tokens) -> Box {
        let c = tokens.capsule
        let rest = closes ? (w: c.restClose, h: c.restClose) : (w: c.collapsedWidth, h: c.collapsedHeight)
        let w = rest.w + (min(c.width, width - 48) - rest.w) * open
        let h = rest.h + (c.height - rest.h) * open
        let full = height - c.bottom - c.height / 2
        let resting = closes ? full : height - c.bottom - rest.h / 2
        let y = resting + (full - resting) * open
        let from = across ?? width / 2
        let x = from + ((middle ?? width / 2) - from) * open
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
    /// floor that is; where every place lies on some text, the one that lies on least.
    public static func pillMiddle(texts: [Box], width: Double, height: Double, tokens: Tokens) -> Double {
        let half = max(tokens.capsule.width, tokens.bubble.maxWidth) / 2 + tokens.band
        let costs = middles(width: width, left: half, right: half).map { middle in
            let pill = pill(open: 1, middle: middle, width: width, height: height, tokens: tokens)
            return (middle, covered([pill, bubbleRoom(over: pill, tokens: tokens)], texts, tokens))
        }
        return (costs.first { $0.1 == 0 } ?? costs.min { $0.1 < $1.1 })?.0 ?? width / 2
    }

    /// Where the pill at rest goes across the display (the collapsed pill, or the cross with `wear` points of logo
    /// and name to its left), so that it lies on none of the page's read text: the display's middle when that is
    /// clear, or else the nearest place along the floor that is. Where every place lies on some text it stays at
    /// the middle. The window takes a click on the cross wherever the painter drew it.
    public static func restMiddle(texts: [Box], closes: Bool, wear: Double, width: Double, height: Double, tokens: Tokens) -> Double {
        let c = tokens.capsule
        let half = (closes ? c.restClose : c.collapsedWidth) / 2 + tokens.band
        let clear = middles(width: width, left: half + (closes ? wear : 0), right: half).first { middle in
            let rest = pill(open: 0, closes: closes, resting: middle, width: width, height: height, tokens: tokens)
            return covered([Box(x: rest.x - (closes ? wear : 0), y: rest.y, w: rest.w + (closes ? wear : 0), h: rest.h)], texts, tokens) == 0
        }
        return clear ?? width / 2
    }

    /// The middles to try along the floor, the display's own first and then a step of 24 points at a time either
    /// way, nearest first, keeping what is placed `left` and `right` of its middle inside the display.
    static func middles(width: Double, left: Double, right: Double) -> [Double] {
        let home = width / 2, cell = 24.0
        var tries = [home]
        for step in stride(from: 1, through: Int(width / 2 / cell), by: 1) {
            let away = Double(step) * cell
            tries += [home - away, home + away].filter { $0 - left >= 0 && $0 + right <= width }
        }
        return tries
    }

    /// How much of the boxes, each with the surface's band round it, lies on the page's read text, in square points.
    static func covered(_ boxes: [Box], _ texts: [Box], _ tokens: Tokens) -> Double {
        boxes.reduce(0) { sum, box in
            let b = box.grown(tokens.band)
            return sum + texts.reduce(0) { $0 + max(0, min(b.x + b.w, $1.x + $1.w) - max(b.x, $1.x)) * max(0, min(b.y + b.h, $1.y + $1.h) - max(b.y, $1.y)) }
        }
    }
}
