import AppKit
import ParalBody

/// What the app does in his apps for him, on his word only: it opens a page of USC's (`Keep.go`), it clicks once on
/// a closed heading paral has boxed (`Hand.press`), and it scrolls the page in front to what an arrow points at.
///
/// It first puts the pointer over the page, since the wheel turns whatever is under the pointer. It scrolls in
/// reaches of less than half a display, each eased like a hand's. After each reach it lets the page come to rest, asks the
/// watcher for a look taken then, and lets the mind answer it; only then does it ask which way the arrow points and
/// go on. A look whose picture was taken while the page was still moving is never acted on: that is what made it go
/// past the thing on a real screen. When the arrow is gone the mark has landed; if the mark is at the foot of the
/// display or under its top edge, one more small move brings it to a third of the way down, and it stops. It also
/// stops when he presses the key, when the page no longer moves, or after `Hand.longest`. What it did is written to
/// `tmp/body.log` beside the mind's log.
final class Does {
    private var timer: Timer?
    private let log: URL? = (Bundle.main.infoDictionary?["ParalTokens"] as? String).map { URL(fileURLWithPath: $0).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("tmp/body.log") }

    /// One line in the app's own log, with the time.
    private func note(_ line: String) {
        guard let log, let data = "\(ISO8601DateFormatter().string(from: Date())) \(line)\n".data(using: .utf8) else { return }
        if let handle = try? FileHandle(forWritingTo: log) { handle.seekToEndOfFile(); handle.write(data); try? handle.close() } else { try? data.write(to: log) }
    }

    /// What tells the scene the scrolling is over, while one is under way.
    private var ended: (() -> Void)?

    /// Stops a scroll under way, and lets the scene draw again: its own end, a new one beginning, or "Start over".
    func stop() {
        timer?.invalidate()
        timer = nil
        ended?()
        ended = nil
    }

    private enum Phase { case aiming(since: Date, down: Bool), moving(turns: ArraySlice<Double>, down: Bool), settling(since: Date), looking(asked: Date), answering(since: Date) }

    /// Takes a line from the mind. `watch` says what the scene and the key are doing now, takes a look when asked,
    /// and says whether the page stands as its last look saw it; `boxed` says whether a point lies inside a box paral
    /// is drawing now.
    /// `tell` gives the scene a line of the app's own: that the scrolling has begun, and that it has ended.
    func take(_ seen: Seen, on screen: NSScreen, watch: Watch, boxed: (Double, Double) -> Bool, tell: @escaping (Seen) -> Void, failed: @escaping (String) -> Void) {
        if case .go(_, let url, _) = seen, !Keep.go(url) { failed("the page could not be opened (\(url))") }
        if case .press(_, let x, let y) = seen {
            // The one click the app ever makes. The mind names the point only for a heading paral has itself boxed on
            // a kept USC page, on his word (`mind/takes.ts`). The app does not take the mind's word for it. Here, all
            // of these must hold: the point lies inside a box the scene is drawing now; he has given the grant; and
            // one picture taken now shows the page as the look that found that heading saw it, exactly so round the
            // point. A page that has moved, or has something new over the heading, is not clicked.
            guard boxed(x, y) else { note("press: refused, the point is in no box that is drawn"); return failed(Hand.unmarked) }
            guard Hand.trusted(ask: true) else { note("press: no Accessibility grant"); return failed(Hand.off) }
            watch.still(x: x, y: y) { [weak self] same in
                let clicked = same && Hand.press(x: x, y: y, on: screen)
                self?.note(clicked ? "press: one click at \(Int(x)), \(Int(y))" : same ? "press: the click could not be made" : "press: refused, the page has moved since the look that found the heading")
                if !same { failed(Hand.moved) } else if !clicked { failed(Hand.missed) }
            }
        }
        guard case .scroll = seen else { return }
        guard Hand.trusted(ask: true) else { note("scroll: no Accessibility grant"); return failed(Hand.off) }
        guard let first = watch.sees()?.scene.down else { return note("scroll: no arrow is up; nothing to scroll to") }
        stop()
        // Until the scrolling ends the scene draws no mark and no card: they come up once, where the page comes to rest.
        tell(.stale(true, hand: true))
        ended = { tell(.stale(false, hand: true)) }
        let began = Date(), high = Double(screen.frame.height)
        /// A reach of `points`, as the turns of the wheel that make it, eased.
        func reach(_ points: Double) -> ArraySlice<Double> { Hand.eased(points, turns: Int(Hand.perSecond * Hand.reachTakes * min(1, max(0.3, abs(points) / (Hand.reach * high)))))[...] }
        // The pointer goes over the page first: he has just pressed paral's own button, and the wheel turns whatever is under the pointer.
        guard Hand.aim(on: screen) else { note("scroll: the display could not be found"); return failed(Hand.stuck) }
        var phase = Phase.aiming(since: began, down: first), reaches = 1, trimmed = false, last = first, turned = 0
        note("scroll: begun, \(first ? "down" : "up")")
        let timer = Timer(timeInterval: 1 / Hand.perSecond, repeats: true) { [weak self] timer in
            let now = Date()
            func end(_ how: String, _ why: String? = nil) {
                self?.stop()
                self?.note("scroll: ended after \(reaches) reach\(reaches == 1 ? "" : "es"), \(how)")
                if let why { failed(why) }
            }
            guard let state = watch.sees(), !state.held else { return end("he pressed the key") }
            guard now.timeIntervalSince(began) < Hand.longest else { return end("it had gone on long enough") }
            switch phase {
            case .aiming(let since, let down):
                // The pointer rests over the page until paral's own window lets the wheel through again.
                guard now.timeIntervalSince(since) >= Hand.rests else { return }
                phase = .moving(turns: reach(Hand.reach * high), down: down)
            case .moving(let turns, let down):
                guard let next = turns.first else { phase = .settling(since: now); return }
                guard Hand.scroll(down: down, by: next) else { return end("the wheel could not be turned", Hand.stuck) }
                phase = .moving(turns: turns.dropFirst(), down: down)
            case .settling(let since):
                // The page has come to rest: a look is asked for now, so its picture is of the page where it stopped.
                guard now.timeIntervalSince(since) >= Hand.settle else { return }
                watch.force()
                phase = .looking(asked: now)
            case .looking(let asked):
                if watch.sentTaken >= asked { phase = .answering(since: now) } else if now.timeIntervalSince(asked) > Hand.patience { end("no look came of the page where it stopped", Hand.stuck) }
            case .answering(let since):
                guard now.timeIntervalSince(since) >= Hand.answered else { return }
                if !watch.sentMoved && !trimmed { return end("the page did not move", Hand.stuck) }
                if let down = state.scene.down {
                    // Still off screen. It may have gone past once and come back; past twice, it stops.
                    if down != last { turned += 1; last = down }
                    guard turned < 2 else { return end("it went past the thing twice", Hand.lost) }
                    reaches += 1
                    phase = .moving(turns: reach(Hand.reach * high * (turned == 0 ? 1 : 0.5)), down: down)
                } else if !trimmed, let y = state.scene.markY, y < Hand.high * high || y > Hand.low * high {
                    // The mark has landed at the foot or under the top edge: one small move brings it where it reads.
                    trimmed = true
                    phase = .moving(turns: reach(y - Hand.rest * high), down: y > Hand.rest * high)
                } else {
                    end(state.scene.markY == nil ? "the arrow is gone" : "the mark has landed")
                }
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }
}
