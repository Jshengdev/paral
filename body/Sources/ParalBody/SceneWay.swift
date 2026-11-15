import Foundation

extension Scene {
    /// The arrow toward what is on this page and not in view. The pen inks it from the moment its line arrives. After
    /// that it is still, and every so often it nods toward its edge: alive, without moving all the time he reads.
    func way(at t: Double) -> WayPicture? {
        guard let way = ways.last(where: { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }) else { return nil }
        let inkedAt = way.at + ms(tokens.way.drawMs)
        let drawn = still ? 1 : Motion.land((t - way.at) / max(inkedAt - way.at, 1))
        return WayPicture(id: way.id, down: way.down, toward: way.toward, drawn: drawn, nod: nod(since: inkedAt, at: t))
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
