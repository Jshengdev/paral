import Foundation

extension Scene {
    /// The arrow on the page at `t`, if one is up.
    func wayUp(at t: Double) -> Way? { ways.last { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) } }

    /// When the pen starts on an arrow and when it has finished: the cursor flies to the arrow first, as it does to
    /// a mark, so the ink waits for it.
    func inking(_ way: Way) -> (from: Double, to: Double) { (way.at + flight, way.at + flight + ms(tokens.way.drawMs)) }

    /// The arrow toward what is on this page and not in view. Its tag is there the moment its line arrives, and the
    /// pen inks the arrow once the cursor has reached it. After that it is still, and every so often it nods toward
    /// its edge: alive, without moving all the time he reads.
    func way(at t: Double) -> WayPicture? {
        guard let way = wayUp(at: t) else { return nil }
        let ink = inking(way)
        let drawn = still ? 1 : Motion.land((t - ink.from) / max(ink.to - ink.from, 1))
        return WayPicture(id: way.id, down: way.down, toward: way.toward, drawn: drawn, nod: nod(since: ink.to, at: t))
    }

    /// A nod is a quick dip and a springy way back. The first comes one rest after the ink is whole, and one follows
    /// each rest after that. Given in half points, so the picture changes only when the arrow would be seen to move.
    private func nod(since inkedAt: Double, at t: Double) -> Double {
        let w = tokens.way
        let every = ms(w.nodEveryMs), length = ms(w.nodMs)
        guard !still, every > 0, length > 0, t >= inkedAt + every else { return 0 }
        let u = (t - inkedAt).truncatingRemainder(dividingBy: every) / length
        guard u < 1 else { return 0 }
        let dip = u < Scene.nodDown ? Motion.ease(u / Scene.nodDown) : 1 - Motion.spring((u - Scene.nodDown) / (1 - Scene.nodDown), bounce: tokens.motion.bounce)
        return (dip * w.nod * 2).rounded() / 2
    }

    /// The share of a nod spent going down; the rest is the springy way back, which is the longer part so that it
    /// reads as a nod and not a slide. Chosen, not measured.
    private static let nodDown = 0.35
}
