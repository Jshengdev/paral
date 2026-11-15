import AppKit
import ParalBody

/// What the app does in his apps for him, on his word only: it opens a page of USC's (`Keep.go`), and it scrolls the
/// page in front to what an arrow points at (`Scroll`). It scrolls in reaches of half a display, and after each one
/// it stops until the watcher has sent a look of the still page and the mind has had time to answer it, so a mark
/// lands on the line where the line is. Before each reach it asks which way the arrow points now and follows that.
/// It stops when the arrow is gone (the mark has landed, or a clear), when he presses the key, when the page no
/// longer moves, or after `Scroll.longest`.
final class Does {
    private var timer: Timer?

    /// Takes a line from the mind. `way` says which way the arrow points now (true is down), nil when none is up or
    /// he holds the key; `looks` is how many looks the watcher has sent so far.
    func take(_ seen: Seen, on screen: NSScreen, way: @escaping () -> Bool?, looks: @escaping () -> Int, failed: @escaping (String) -> Void) {
        if case .go(_, let url, _) = seen, !Keep.go(url) { failed("the page could not be opened (\(url))") }
        guard case .scroll = seen else { return }
        guard Scroll.trusted(ask: true) else { return failed(Scroll.off) }
        timer?.invalidate()
        let began = Date(), reach = Scroll.reach * Double(screen.frame.height) / (Scroll.turn * Scroll.perSecond)
        // Either it is moving the page until a moment, or it has stopped and waits for a look sent after that moment.
        var movingUntil: Date? = began.addingTimeInterval(reach), stopped = began, seenThen = looks(), lookedAt: Date?
        let timer = Timer(timeInterval: 1 / Scroll.perSecond, repeats: true) { [weak self] timer in
            let now = Date()
            func end(_ why: String? = nil) {
                timer.invalidate()
                self?.timer = nil
                if let why { failed(why) }
            }
            guard now.timeIntervalSince(began) < Scroll.longest, let down = way() else { return end() }
            if let until = movingUntil {
                if now < until { if !Scroll.step(down: down, on: screen) { end(Scroll.stuck) } } else { (movingUntil, stopped, seenThen, lookedAt) = (nil, now, looks(), nil) }
            } else if looks() > seenThen {
                // A look of the still page has gone to the mind: once it has had time to answer and the arrow is still up, on.
                if let at = lookedAt { if now.timeIntervalSince(at) >= Scroll.answered { movingUntil = now.addingTimeInterval(reach) } } else { lookedAt = now }
            } else if now.timeIntervalSince(stopped) > Scroll.patience {
                end(Scroll.stuck)
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }
}
