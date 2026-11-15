import CoreGraphics
import Foundation

/// One curve of motion: a share of the time in, a share of the way out. It is a cubic Bézier from (0, 0) to (1, 1)
/// pulled toward (x1, y1) and (x2, y2), as a stylesheet writes `cubic-bezier(x1, y1, x2, y2)`. With x1 and x2
/// between 0 and 1 the time only runs forward along it.
public struct Curve: Codable, Equatable {
    public var x1, y1, x2, y2: Double

    public func callAsFunction(_ time: Double) -> Double {
        let x = min(max(time, 0), 1)
        guard x > 0, x < 1 else { return x }
        func along(_ a: Double, _ b: Double, _ s: Double) -> Double { 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s }
        // The place on the curve for a time is found by halving: forty halvings are finer than any pixel.
        var low = 0.0, high = 1.0
        for _ in 0..<40 {
            let middle = (low + high) / 2
            if along(x1, x2, middle) < x { low = middle } else { high = middle }
        }
        return along(y1, y2, (low + high) / 2)
    }
}

/// The four curves everything moves on. Text never uses them; it steps. Ink does not either: a pen runs at even speed.
public struct Curves: Codable {
    /// Arriving: it leaves at once and lands very softly, with no bounce. What comes up (the capsule at a press, a
    /// card, a toast) and what comes to rest after a nod.
    public var arrive: Curve
    /// Going from one place to another, slow at both ends: the cursor's flight and its step aside, a card growing
    /// to hold its rows, the dip of a nod.
    public var travel: Curve
    /// Leaving: slow to start and then gone, in less time than arriving took.
    public var leave: Curve
    /// Going a little past and coming back. Only for a small thing popping out (the cursor's tag); never a card or words.
    public var pop: Curve
}

/// How things move that is not one of the four curves.
enum Motion {
    /// Even speed, for ink: a share of the time is the same share of the stroke.
    static func even(_ x: Double) -> Double { min(max(x, 0), 1) }

    /// One clean arc between two places: the straight way, bowed toward the top of the screen by `lift`, a share
    /// of the distance.
    static func arc(from a: CGPoint, to b: CGPoint, _ u: Double, lift: Double) -> CGPoint {
        var side = CGPoint(x: -(b.y - a.y), y: b.x - a.x)
        if side.y > 0 { side = CGPoint(x: -side.x, y: -side.y) }
        let mid = CGPoint(x: (a.x + b.x) / 2 + side.x * lift, y: (a.y + b.y) / 2 + side.y * lift)
        let v = 1 - u
        return CGPoint(x: v * v * a.x + 2 * v * u * mid.x + u * u * b.x, y: v * v * a.y + 2 * v * u * mid.y + u * u * b.y)
    }
}
