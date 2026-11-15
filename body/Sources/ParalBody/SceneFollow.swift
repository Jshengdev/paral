import CoreGraphics
import Foundation

/// His own pointer, which paral's cursor keeps beside while it has nothing to draw (`ScenePointer.swift`). The app
/// tells the scene where his pointer is sixty times a second (`Key.onMove`); the scene keeps a sight only when the
/// pointer has moved `cursor.followLeast` from the last one kept and either `cursor.followEveryMs` has passed since
/// it or the pointer has stood still since the sight before, so the place he stopped at is always kept. What is kept
/// is all the scene ever reads, and a scripted run writes exactly that to `pointer.jsonl` for its film. None of it
/// crosses the seam: the mind is never told where his pointer is.
extension Scene {
    /// One sight of his pointer, in display points from the main display's top-left. Gives back whether it was kept.
    @discardableResult
    public mutating func moved(x: Double, y: Double, at: Double) -> Bool {
        let c = tokens.cursor, before = his.last
        his.last = (x, y)
        if let kept = his.kept.last {
            guard hypot(x - kept.x, y - kept.y) >= c.followLeast else { return false }
            let stood = before.map { $0.x == x && $0.y == y } ?? false
            guard at - kept.at >= c.followEveryMs || stood else { return false }
        }
        his.kept.append((x, y, at))
        return true
    }

    /// The sights of his pointer kept so far, as a scripted run writes them for its film.
    public var sights: [(x: Double, y: Double, at: Double)] { his.kept }

    /// Where paral's cursor's tip is at `t` while it follows his pointer, or nil before any sight of it: just beside
    /// his pointer (`cursor.followX` right and `cursor.followY` down from its tip, so it covers neither the tip nor
    /// what he points at), chasing it as a spring that goes past nothing does, nine tenths of the way to where he
    /// stopped `cursor.followMs` after he stopped. Given in half points, so the picture stands still once it has come.
    func following(at t: Double) -> CGPoint? {
        let seen = his.kept
        var low = 0, high = seen.count
        while low < high { let middle = (low + high) / 2; if seen[middle].at <= t { low = middle + 1 } else { high = middle } }
        guard low > 0 else { return nil }
        let last = low - 1, c = tokens.cursor
        let w = 3.89 / max(ms(c.followMs), 1)
        // What came more than ten of its times before is spent: the chase starts there, at rest on that sight.
        var first = last
        while first > 0, seen[last].at - seen[first].at < 10 / w { first -= 1 }
        var p = (x: seen[first].x, y: seen[first].y), v = (x: 0.0, y: 0.0)
        func chase(_ to: (x: Double, y: Double, at: Double), for dt: Double) {
            let e = exp(-w * dt), ax = p.x - to.x, ay = p.y - to.y, bx = v.x + w * ax, by = v.y + w * ay
            p = (to.x + (ax + bx * dt) * e, to.y + (ay + by * dt) * e)
            v = ((v.x - w * bx * dt) * e, (v.y - w * by * dt) * e)
        }
        if first < last { for i in (first + 1)...last { chase(seen[i - 1], for: seen[i].at - seen[i - 1].at) } }
        chase(seen[last], for: t - seen[last].at)
        let half = { (value: Double) in (value * 2).rounded() / 2 }
        return CGPoint(x: half(p.x - origin.x + c.followX), y: half(p.y - origin.y + c.followY))
    }
}
