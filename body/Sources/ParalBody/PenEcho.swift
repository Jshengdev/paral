import CoreGraphics
import Foundation

extension Pen {
    /// The echo of a mark that waits for his click, after the design kit's highlight: a copy of the mark's whole edge
    /// pushed out from its middle, `grown` of the way (0 to 1) to `mark.echoGrows` larger. On a side where that
    /// would bring its ink onto the page's other words or off the display it is pushed only as far as there is
    /// room, so between close lines it grows sideways and hardly up or down.
    static func echo(of mark: MarkPicture, grown: Double, tokens: Tokens, avoiding texts: [Box], inside display: (w: Double, h: Double)) -> [CGPoint] {
        var whole = mark
        whole.drawn = 1
        let edge = path(of: whole, tokens: tokens, avoiding: texts, inside: display)
        guard let left = edge.map(\.x).min(), let right = edge.map(\.x).max(), let top = edge.map(\.y).min(), let bottom = edge.map(\.y).max() else { return [] }
        let m = tokens.mark
        let middle = CGPoint(x: (left + right) / 2, y: (top + bottom) / 2)
        let wide = max(right - left, 1) / 2, tall = max(bottom - top, 1) / 2
        // Its own ink, and a point of air, kept from every other line's words.
        let air = m.width / 2 + 1
        // The page's other words: every read line the mark is not on.
        let others = texts.filter { !($0.x + $0.w / 2 > left && $0.x + $0.w / 2 < right && $0.y + $0.h / 2 > top && $0.y + $0.h / 2 < bottom) }
        let reach = (x: wide * m.echoGrows, y: tall * m.echoGrows)
        let above = others.filter { $0.x < right + reach.x && left - reach.x < $0.x + $0.w && $0.y + $0.h / 2 <= top }.map { top - ($0.y + $0.h) }
        let below = others.filter { $0.x < right + reach.x && left - reach.x < $0.x + $0.w && $0.y + $0.h / 2 >= bottom }.map { $0.y - bottom }
        let before = others.filter { $0.y < bottom + reach.y && top - reach.y < $0.y + $0.h && $0.x + $0.w / 2 <= left }.map { left - ($0.x + $0.w) }
        let after = others.filter { $0.y < bottom + reach.y && top - reach.y < $0.y + $0.h && $0.x + $0.w / 2 >= right }.map { $0.x - right }
        func room(_ wanted: Double, _ gaps: [Double], _ toEdge: Double) -> Double { max(0, min(wanted, (gaps.min() ?? .infinity) - air, toEdge - m.pad)) }
        let up = room(reach.y, above, top), down = room(reach.y, below, display.h - bottom)
        let back = room(reach.x, before, left), on = room(reach.x, after, display.w - right)
        return edge.map { point in
            let dx = point.x - middle.x, dy = point.y - middle.y
            return CGPoint(x: middle.x + dx * (1 + (dx < 0 ? back : on) / wide * grown), y: middle.y + dy * (1 + (dy < 0 ? up : down) / tall * grown))
        }
    }
}
