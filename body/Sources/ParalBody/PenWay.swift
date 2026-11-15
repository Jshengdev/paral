import CoreGraphics
import Foundation

extension Pen {
    /// The barbs of the arrow's head open this far to each side of the way its shaft arrives: the angle of the
    /// design kit's drawn arrow (33 and 36 degrees, measured from its path).
    private static let barb = 35 * Double.pi / 180

    /// The arrow that says which way to scroll, as the strokes a hand makes: the shaft, which leaves the tag beside
    /// it level with the tag's words, swings out and turns toward the edge, then the head as one stroke through the
    /// tip. `box` is the room the whole arrow has, and `inset` how far below the box's top the shaft begins.
    static func arrow(in box: Box, inset: Double, down: Bool, tokens: Tokens) -> [[CGPoint]] {
        // Laid out pointing down, and turned over at the end for an arrow that points up.
        let tail = CGPoint(x: box.x, y: box.y + inset), tip = CGPoint(x: box.x + box.w * 0.62, y: box.y + box.h)
        let out = CGPoint(x: box.x + box.w * 0.8, y: tail.y - 1), turn = CGPoint(x: box.x + box.w, y: box.y + inset + (box.h - inset) * 0.4)
        let steps = 28
        let shaft = (0...steps).map { step -> CGPoint in
            let u = Double(step) / Double(steps), v = 1 - u
            let a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u
            return CGPoint(x: a * tail.x + b * out.x + c * turn.x + d * tip.x, y: a * tail.y + b * out.y + c * turn.y + d * tip.y)
        }
        let back = atan2(turn.y - tip.y, turn.x - tip.x), barbs = tokens.way.head
        let head = [-1.0, 0, 1].map { side in
            side == 0 ? tip : CGPoint(x: tip.x + barbs * cos(back + side * barb), y: tip.y + barbs * sin(back + side * barb))
        }
        guard !down else { return [shaft, head] }
        return [shaft, head].map { stroke in stroke.map { CGPoint(x: $0.x, y: 2 * box.y + box.h - $0.y) } }
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
