import CoreGraphics
import Foundation

/// Where things go on a display, in points from its top-left corner.
public enum Layout {
    /// `taller` is extra height when the capsule carries a trail above its words. It grows upward, so the foot stays put.
    public static func capsule(open: Double, closes: Bool = false, taller: Double = 0, width: Double, height: Double, tokens: Tokens) -> Box {
        let c = tokens.capsule
        let rest = closes ? c.restClose : c.rest
        let w = rest + (min(c.width, width - 48) - rest) * open
        let h = rest + (c.height + taller - rest) * open
        return Box(x: (width - w) / 2, y: height - c.bottom - c.height / 2 - h / 2 - taller * open / 2, w: w, h: h)
    }

    /// How much taller the capsule is while it carries a trail of steps above its words.
    public static func band(_ tokens: Tokens) -> Double { tokens.capsule.tagType + 12 }

    /// Where the arrow that says which way to scroll goes: at the edge he must scroll toward, as near as it can be
    /// to its home there (beside the open capsule at the bottom, the middle at the top), and on none of `taken` nor
    /// on the capsule. Where every place at that edge is taken, it goes where it covers least.
    public static func way(down: Bool, size: (w: Double, h: Double), taken: [Box], width: Double, height: Double, tokens: Tokens) -> Box {
        let w = tokens.way
        let cell = 24.0
        // Room for the nod and the pen's width, so that nothing it avoids is touched while it moves.
        let around = w.nod + tokens.mark.width
        let capsule = capsule(open: 1, taller: band(tokens), width: width, height: height, tokens: tokens)
        let avoid = taken + [capsule]
        let home = down ? (x: capsule.x + capsule.w + w.edge, y: height - w.edge - size.h) : (x: (width - size.w) / 2, y: w.edge)
        func covered(_ box: Box) -> Double {
            let b = box.grown(around)
            return avoid.reduce(0) { $0 + max(0, min(b.x + b.w, $1.x + $1.w) - max(b.x, $1.x)) * max(0, min(b.y + b.h, $1.y + $1.h) - max(b.y, $1.y)) }
        }
        let leftmost = w.edge, rightmost = width - w.edge - size.w
        guard rightmost >= leftmost else { return Box(x: max(0, (width - size.w) / 2), y: home.y, w: size.w, h: size.h) }
        let first = Int(((leftmost - home.x) / cell).rounded(.up)), last = Int(((rightmost - home.x) / cell).rounded(.down))
        // Further than a third of the display from its edge it would no longer say "this edge".
        let rows = Int(height / 3 / cell)
        var best: (cost: Double, box: Box)?
        for row in 0...rows {
            for col in min(first, last)...max(first, last) {
                let x = min(max(home.x + Double(col) * cell, leftmost), rightmost), y = home.y + Double(row) * cell * (down ? -1 : 1)
                let box = Box(x: x, y: y, w: size.w, h: size.h)
                // A place that covers anything loses to any place that covers nothing; among those, the nearest to home
                // wins, and a step away from the edge counts three times a step along it.
                let cost = covered(box) * 1000 + hypot(x - home.x, 3 * (y - home.y))
                if cost < (best?.cost ?? .infinity) { best = (cost, box) }
            }
        }
        return best?.box ?? Box(x: home.x, y: home.y, w: size.w, h: size.h)
    }

    /// How wide the cursor is for a height of one: the design kit's arrow is 72 wide and 92.6 tall, and its shape
    /// before the corners are rounded, which is what is laid out here, 75 by 97.9.
    static let cursorWide = 0.766

    /// Where the cursor's tip rests once its mark is drawn: just beside the mark and pointing back at it, on none of
    /// the page's text. To the right first, where a line most often ends in empty page; then under the mark's end
    /// and under its start. The first place that covers no text and is inside the display wins; failing that, the
    /// one that covers least.
    public static func beside(_ mark: Box, cursor: (w: Double, h: Double), edge: Double, gap: Double, texts: [Box], width: Double, height: Double) -> CGPoint {
        let right = mark.x + mark.w + gap, middle = mark.y + mark.h / 2
        let tips = [
            CGPoint(x: right, y: middle - cursor.h / 4), CGPoint(x: right, y: mark.y + mark.h - cursor.h / 8), CGPoint(x: right, y: mark.y - cursor.h / 2),
            CGPoint(x: mark.x + mark.w - cursor.w, y: mark.y + mark.h + gap), CGPoint(x: mark.x, y: mark.y + mark.h + gap),
        ]
        func cost(_ tip: CGPoint) -> Double {
            // Its paper edge is part of it, and a point more keeps it from grazing a line.
            let body = Box(x: tip.x, y: tip.y, w: cursor.w, h: cursor.h).grown(edge + 1)
            let outside = body.x < 0 || body.y < 0 || body.x + body.w > width || body.y + body.h > height
            let covered = texts.reduce(0) { $0 + max(0, min(body.x + body.w, $1.x + $1.w) - max(body.x, $1.x)) * max(0, min(body.y + body.h, $1.y + $1.h) - max(body.y, $1.y)) }
            return covered + (outside ? cursor.w * cursor.h : 0)
        }
        return tips.enumerated().min { (cost($0.element), $0.offset) < (cost($1.element), $1.offset) }?.element ?? tips[0]
    }

    /// The largest empty rectangle left by the page's text and the capsule, found on a coarse grid.
    public static func room(texts: [Box], width: Double, height: Double, tokens: Tokens) -> Box {
        let cell = 24.0, margin = tokens.board.margin
        let cols = Int(width / cell), rows = Int(height / cell)
        guard cols > 2, rows > 2 else { return Box(x: 0, y: 0, w: max(width, 1), h: max(height, 1)) }
        let taken = texts.map { $0.grown(margin) } + [capsule(open: 1, width: width, height: height, tokens: tokens).grown(margin)]
        func free(_ col: Int, _ row: Int) -> Bool {
            if col == 0 || row == 0 || col == cols - 1 || row == rows - 1 { return false }
            let x = Double(col) * cell, y = Double(row) * cell
            return !taken.contains { $0.x < x + cell && x < $0.x + $0.w && $0.y < y + cell && y < $0.y + $0.h }
        }
        var heights = [Int](repeating: 0, count: cols)
        var best = (area: 0, col: 1, row: 1, w: 1, h: 1)
        for row in 0..<rows {
            for col in 0..<cols { heights[col] = free(col, row) ? heights[col] + 1 : 0 }
            var stack: [Int] = []
            for col in 0...cols {
                let tall = col < cols ? heights[col] : 0
                while let top = stack.last, heights[top] >= tall {
                    stack.removeLast()
                    let left = (stack.last ?? -1) + 1
                    let w = col - left, h = heights[top]
                    if w * h > best.area { best = (w * h, left, row - h + 1, w, h) }
                }
                stack.append(col)
            }
        }
        return Box(x: Double(best.col) * cell, y: Double(best.row) * cell, w: Double(best.w) * cell, h: Double(best.h) * cell)
    }
}
