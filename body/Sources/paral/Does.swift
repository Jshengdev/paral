import AppKit
import ParalBody

/// What the app does in his apps for him, on his word only: it opens a page of USC's (`Keep.go`), it clicks once on
/// a closed heading paral has boxed (`Hand.press`), and it scrolls the page in front to what an arrow points at. It scrolls in reaches of half a display, and after each one
/// it stops until the watcher has sent a look of the still page and the mind has had time to answer it, so a mark
/// lands on the line where the line is. Before each reach it asks which way the arrow points now and follows that.
/// It stops when the arrow is gone (the mark has landed, or a clear), when he presses the key, when the page no
/// longer moves, or after `Hand.longest`.
final class Does {
    private var timer: Timer?

    /// Stops a scroll under way: "Start over".
    func stop() {
        timer?.invalidate()
        timer = nil
    }

    /// Takes a line from the mind. `way` says which way the arrow points now (true is down), nil when none is up or
    /// he holds the key; `watch` says how many looks it has sent and whether the page stands as its last look saw it.
    /// `boxed` says whether a point lies inside a box paral is drawing now.
    func take(_ seen: Seen, on screen: NSScreen, watch: Watch, boxed: (Double, Double) -> Bool, way: @escaping () -> Bool?, failed: @escaping (String) -> Void) {
        let looks = { watch.sent }
        if case .go(_, let url, _) = seen, !Keep.go(url) { failed("the page could not be opened (\(url))") }
        if case .press(_, let x, let y) = seen {
            // The one click the app ever makes. The mind names the point only for a heading paral has itself boxed on
            // a kept USC page, on his word (`mind/takes.ts`). The app does not take the mind's word for it. Here, all
            // of these must hold: the point lies inside a box the scene is drawing now; he has given the grant; and
            // one picture taken now shows the page as the look that found that heading saw it, exactly so round the
            // point. A page that has moved, or has something new over the heading, is not clicked.
            guard boxed(x, y) else { return failed(Hand.unmarked) }
            guard Hand.trusted(ask: true) else { return failed(Hand.off) }
            watch.still(x: x, y: y) { same in
                if !same { failed(Hand.moved) } else if !Hand.press(x: x, y: y, on: screen) { failed(Hand.missed) }
            }
        }
        guard case .scroll = seen else { return }
        guard Hand.trusted(ask: true) else { return failed(Hand.off) }
        timer?.invalidate()
        let began = Date(), reach = Hand.reach * Double(screen.frame.height) / (Hand.turn * Hand.perSecond)
        // Either it is moving the page until a moment, or it has stopped and waits for a look sent after that moment.
        var movingUntil: Date? = began.addingTimeInterval(reach), stopped = began, seenThen = looks(), lookedAt: Date?
        let timer = Timer(timeInterval: 1 / Hand.perSecond, repeats: true) { [weak self] timer in
            let now = Date()
            func end(_ why: String? = nil) {
                timer.invalidate()
                self?.timer = nil
                if let why { failed(why) }
            }
            guard now.timeIntervalSince(began) < Hand.longest, let down = way() else { return end() }
            if let until = movingUntil {
                if now < until { if !Hand.scroll(down: down, on: screen) { end(Hand.stuck) } } else { (movingUntil, stopped, seenThen, lookedAt) = (nil, now, looks(), nil) }
            } else if looks() > seenThen {
                // A look of the still page has gone to the mind: once it has had time to answer and the arrow is still up, on.
                if let at = lookedAt { if now.timeIntervalSince(at) >= Hand.answered { movingUntil = now.addingTimeInterval(reach) } } else { lookedAt = now }
            } else if now.timeIntervalSince(stopped) > Hand.patience {
                end(Hand.stuck)
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }
}
