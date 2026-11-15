import Foundation

extension Scene {
    /// The arrow on the page at `t`, if one is up.
    func wayUp(at t: Double) -> Way? { ways.last { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) } }

    /// When the pen starts on an arrow and when it has finished: the cursor flies to the arrow first, as it does to
    /// a mark, so the ink waits for it.
    func inking(_ way: Way) -> (from: Double, to: Double) { (way.at + flight, way.at + flight + arrowMs) }

    /// The arrow toward what is on this page and not in view. Its tag is there the moment its line arrives, and the
    /// pen inks the arrow once the cursor has reached it. After that it is still, and every so often it nods toward
    /// its edge: alive, without moving all the time he reads.
    func way(at t: Double) -> WayPicture? {
        guard let way = wayUp(at: t) else { return nil }
        let ink = inking(way)
        let drawn = still ? 1 : Motion.even((t - ink.from) / max(ink.to - ink.from, 1))
        return WayPicture(id: way.id, down: way.down, toward: way.toward, drawn: drawn, nod: nod(since: ink.to, at: t))
    }

    /// The toast that says a date has been opened in his calendar: up for its stay from the moment of the `open` line,
    /// coming and going as the board does. It is not ink on the page, so a clear does not take it and it brings no cross.
    func toast(at t: Double) -> ToastPicture? {
        guard let opened, t >= opened.at else { return nil }
        let gone = opened.at + ms(tokens.motion.arriveMs) + tokens.toast.stayMs
        guard t < gone + ms(tokens.motion.leaveMs) else { return nil }
        let appear = still ? 1 : min(arriving(since: opened.at, at: t), 1 - leaving(since: gone, at: t))
        // The date follows the words after a dot, as the kit's toast writes it.
        return ToastPicture(text: tokens.strings.opened + (opened.label.map { " · " + $0 } ?? ""), appear: appear)
    }

    /// A nod is a dip, slow at both ends, and a way back that sets off at once and lands softly; it goes past
    /// nothing. The first comes one rest after the ink is whole, and one follows
    /// each rest after that. Given in half points, so the picture changes only when the arrow would be seen to move.
    private func nod(since inkedAt: Double, at t: Double) -> Double {
        let w = tokens.way
        let every = ms(w.nodEveryMs), length = ms(w.nodMs)
        guard !still, every > 0, length > 0, t >= inkedAt + every else { return 0 }
        let u = (t - inkedAt).truncatingRemainder(dividingBy: every) / length
        guard u < 1 else { return 0 }
        let dip = u < Scene.nodDown ? tokens.curves.travel(u / Scene.nodDown) : 1 - tokens.curves.arrive((u - Scene.nodDown) / (1 - Scene.nodDown))
        return (dip * w.nod * 2).rounded() / 2
    }

    /// The share of a nod spent going down; the rest is the soft way back, which is the longer part so that it
    /// reads as a nod and not a slide. Chosen, not measured.
    private static let nodDown = 0.35
}
