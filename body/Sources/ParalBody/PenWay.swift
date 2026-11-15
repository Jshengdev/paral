import CoreGraphics
import Foundation

/// The strokes of the two drawn arrows, both after the design kit's ("Lost and Found: brand kit", page 08): the arrow
/// that says which way to scroll, and the arrow that leads from a mark to what speaks about it.
extension Pen {
    /// The barbs of an arrow's head open this far to each side of the way its shaft arrives: the angle of the
    /// design kit's drawn arrow (33 and 36 degrees, measured from its path).
    private static let barb = 35 * Double.pi / 180

    /// How far each end of the leading arrow's curve is pulled, as shares of the straight way between its ends: out
    /// of the mark the way it leaves, and back from the tip the way it arrives. Measured from the kit's drawn arrow,
    /// whose curve runs 328 points and whose handles are 120 and 105 long.
    private static let leaves = 0.37, lands = 0.32

    /// One curve from `a` to `d`, pulled toward `b` and `c`, as the points a pen passes.
    private static func curve(_ a: CGPoint, _ b: CGPoint, _ c: CGPoint, _ d: CGPoint, steps: Int) -> [CGPoint] {
        (0...steps).map { step in
            let u = Double(step) / Double(steps), v = 1 - u
            let p = v * v * v, q = 3 * v * v * u, r = 3 * v * u * u, s = u * u * u
            return CGPoint(x: p * a.x + q * b.x + r * c.x + s * d.x, y: p * a.y + q * b.y + r * c.y + s * d.y)
        }
    }

    /// The head as one stroke through the tip, its barbs opened round the way back along the shaft.
    private static func head(at tip: CGPoint, back: Double, tokens: Tokens) -> [CGPoint] {
        [-1.0, 0, 1].map { side in
            side == 0 ? tip : CGPoint(x: tip.x + tokens.way.head * cos(back + side * barb), y: tip.y + tokens.way.head * sin(back + side * barb))
        }
    }

    /// The arrow that says which way to scroll, as the strokes a hand makes: the shaft, which leaves the tag beside
    /// it level with the tag's words, swings out and turns toward the edge, then the head as one stroke through the
    /// tip. `box` is the room the whole arrow has, and `inset` how far below the box's top the shaft begins.
    static func arrow(in box: Box, inset: Double, down: Bool, tokens: Tokens) -> [[CGPoint]] {
        // Laid out pointing down, and turned over at the end for an arrow that points up.
        let tail = CGPoint(x: box.x, y: box.y + inset), tip = CGPoint(x: box.x + box.w * 0.62, y: box.y + box.h)
        let out = CGPoint(x: box.x + box.w * 0.8, y: tail.y - 1), turn = CGPoint(x: box.x + box.w, y: box.y + inset + (box.h - inset) * 0.4)
        let strokes = [curve(tail, out, turn, tip, steps: 28), head(at: tip, back: atan2(turn.y - tip.y, turn.x - tip.x), tokens: tokens)]
        guard !down else { return strokes }
        return strokes.map { stroke in stroke.map { CGPoint(x: $0.x, y: 2 * box.y + box.h - $0.y) } }
    }

    /// The arrow that leads from a mark to what speaks about it: one bow that leaves `from` the way `out` points and
    /// arrives at `to` turned as far to the other side of the straight way as it left on this side, so it never
    /// doubles back on itself; then the head. `held` is how much longer than the kit's it keeps to the way it left
    /// before it turns (1 for the kit's own bow). Also gives the way it arrives, as a direction of length one.
    static func lead(from: CGPoint, out: CGPoint, to: CGPoint, held: Double = 1, tokens: Tokens) -> (strokes: [[CGPoint]], arrives: CGPoint) {
        let far = max(hypot(to.x - from.x, to.y - from.y), 1)
        let way = CGPoint(x: (to.x - from.x) / far, y: (to.y - from.y) / far)
        let along = out.x * way.x + out.y * way.y
        let arrives = CGPoint(x: 2 * along * way.x - out.x, y: 2 * along * way.y - out.y)
        let pull = CGPoint(x: from.x + out.x * far * leaves * held, y: from.y + out.y * far * leaves * held)
        let turn = CGPoint(x: to.x - arrives.x * far * lands, y: to.y - arrives.y * far * lands)
        return ([curve(from, pull, turn, to, steps: 36), head(at: to, back: atan2(-arrives.y, -arrives.x), tokens: tokens)], arrives)
    }

    /// Several strokes cut at a share of their whole length, in the order they are drawn: each as far as the pen has got.
    static func reach(strokes: [[CGPoint]], _ share: Double) -> [[CGPoint]] {
        func length(_ points: [CGPoint]) -> Double {
            zip(points, points.dropFirst()).reduce(0) { $0 + hypot($1.1.x - $1.0.x, $1.1.y - $1.0.y) }
        }
        var left = strokes.reduce(0) { $0 + length($1) } * min(max(share, 0), 1)
        var inked: [[CGPoint]] = []
        for stroke in strokes where left > 0 {
            let whole = length(stroke)
            inked.append(reach(stroke, whole > 0 ? left / whole : 1).inked)
            left -= whole
        }
        return inked
    }
}
