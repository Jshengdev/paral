import CoreGraphics
import Foundation

/// How things move, as pure curves: a share of the time in, a share of the way out. Text never uses these; it steps.
enum Motion {
    /// Slow at both ends. For things that fade or shrink away.
    static func ease(_ x: Double) -> Double {
        let t = min(max(x, 0), 1)
        return t * t * (3 - 2 * t)
    }

    /// Fast, then gentle at the end. For ink: the pen sets off at once and lands softly.
    static func land(_ x: Double) -> Double {
        let t = min(max(x, 0), 1)
        return 1 - pow(1 - t, 3)
    }

    /// A damped spring that goes past its place by `bounce` (a share of the way) and settles. For what is alive:
    /// the capsule opening and the pointer landing. With no bounce it is `land`.
    static func spring(_ x: Double, bounce: Double) -> Double {
        let t = min(max(x, 0), 1)
        guard bounce > 0.001, bounce < 0.9 else { return land(t) }
        if t >= 1 { return 1 }
        let decay = 5.0, turn = decay * Double.pi / log(1 / bounce)
        return 1 - exp(-decay * t) * (cos(turn * t) + decay / turn * sin(turn * t))
    }

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
