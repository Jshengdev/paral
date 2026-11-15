import Foundation

extension Scene {
    /// What the watcher and the scroller ask of the scene: whether an ask is being heard or answered (the capsule is
    /// not at rest), when a look would cut into it; which way the arrow points when one says the thing he was pointed
    /// to is off screen (true is down), nil when none is up; and whether anything of paral's is placed on the page now
    /// (a mark or that arrow), which a page that moves would leave behind.
    public func watching(at t: Double) -> (busy: Bool, down: Bool?, placed: Bool) {
        let way = wayUp(at: t)
        return (capsule(at: t).look != .rest, way?.down, way != nil || marks.contains { $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) })
    }

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
        return WayPicture(id: way.id, down: way.down, toward: way.toward, drawn: drawn, nod: nod(since: ink.to, at: t), button: still ? 1 : arriving(since: ink.to + ms(tokens.motion.buttonsAfterMs), at: t))
    }

    /// The toast that says a date has been opened in his calendar: up for its stay from the moment of the `open` line,
    /// coming and going as a card does. A moment after it comes its badge pops out and the tick in it draws itself.
    /// It is not ink on the page, so a clear does not take it and it brings no cross.
    func toast(at t: Double) -> ToastPicture? {
        guard let opened, t >= opened.at else { return nil }
        let gone = opened.at + ms(tokens.motion.arriveMs) + tokens.toast.stayMs
        guard t < gone + ms(tokens.motion.leaveMs) else { return nil }
        let coming = coming(since: opened.at, lines: 0, gone: still ? 0 : leaving(since: gone, at: t), at: t)
        // The badge and its tick take the usual time of a small change, the tick at a pen's even speed.
        let popped = (t - opened.at - ms(tokens.toast.badgeAfterMs)) / max(ms(tokens.motion.usualMs), 1)
        // The date follows the words after a dot, as the kit's toast writes it; a page opened is named after "Opening".
        let words = opened.page ? tokens.strings.going + " " + (opened.label ?? "") : tokens.strings.opened + (opened.label.map { " · " + $0 } ?? "")
        return ToastPicture(text: words, appear: min(max(coming.card, 0), 1) * (1 - coming.gone),
                            coming: coming, badge: still ? 1 : tokens.curves.pop(popped), tick: still ? 1 : Motion.even(popped))
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
