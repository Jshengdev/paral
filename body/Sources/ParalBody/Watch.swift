import AppKit

/// Looks at a display with no key pressed. Every round it takes a picture and makes a small grey print of it, with
/// the menu bar left out: a clock or a recording's timer ticks there, and would make every round look new. `Rounds`
/// says from the prints alone whether the round is a look to report: the page has changed since the last one
/// reported and has stood still for a round, or, while an arrow says the thing is off screen (`waiting`), it has
/// changed at all. Reading the text is what a look costs, so it is read only for a look that is reported. It does
/// not look while `busy` says the key is down or an answer is being said, and paral's own window is left out of the
/// picture, so what paral draws never counts as a change.
public final class Watch {
    /// Two prints with fewer than this share of their points apart are the same page (`Screen.alike`): about a dozen
    /// changed signs on a display. Not measured on a real screen.
    public static let within = 0.0015
    private let screen: NSScreen
    private var timer: Timer?
    private var looking = false
    private var rounds = Rounds()
    /// How many looks have been sent so far: the scroller waits for the next one after each reach.
    public private(set) var sent = 0
    private var next = Date.distantPast
    public var busy: () -> Bool = { false }
    /// Whether anything of paral's is placed on the page: the rounds then report at once, `most` in a row at most.
    public var waiting: () -> Bool = { false }
    /// A look to send: where its smaller copy was saved, the picture's size, where its display is, and the lines read from it.
    public var onLook: ((String, Int, Int, DisplayPlace, [ReadLine]) -> Void)?
    private var everyMs = 0.0, most = 0, longEdge = 1280.0

    public init(screen: NSScreen) { self.screen = screen }

    /// Starts looking every `everyMs`; zero means never. Starting twice does nothing. `most` is how many rounds in a
    /// row may be reported at once while waiting. `longEdge` is the size of the copy saved for the mind, in a file
    /// of its own that the next look overwrites.
    public func start(everyMs: Double, most: Int, longEdge: Double) {
        (self.everyMs, self.most, self.longEdge) = (everyMs, most, longEdge)
        guard everyMs > 0, timer == nil else { return }
        let timer = Timer(timeInterval: min(everyMs, 250) / 1000, repeats: true) { [weak self] _ in self?.look() }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    /// Forgets the last look sent, so the next round of a page that stands still is a look again: "Start over".
    public func again() {
        rounds = Rounds()
        next = .distantPast
    }

    /// The menu bar's height, in points: what the display has above the room it leaves to windows.
    private var bar: Double { max(0, screen.frame.maxY - screen.visibleFrame.maxY) }

    /// Whether the display still shows what the last look sent to the mind saw: one picture taken now, against that
    /// look's print, and strictly so round the point `x`, `y` (in the desktop's points, as a mark's box is). Asked
    /// before a click at a place that look found, so nothing is clicked on a page that has moved or has something new
    /// over it. False when the display cannot be found.
    public func still(x: Double, y: Double, _ then: @escaping (Bool) -> Void) {
        guard let (_, place, size) = Screen.place(of: screen) else { return then(false) }
        let screen = self.screen, bar = self.bar
        let near = (x: (x - place.x) / max(size.width, 1), y: (y - place.y - bar) / max(size.height - bar, 1))
        Task { [weak self] in
            let shot = try? await Screen.picture(of: screen)
            let print = shot.map { Screen.print($0.image, skip: Int(bar * $0.place.scale)) } ?? Data()
            await MainActor.run { then(print.count == 320 * 200 && (self?.rounds.isLast(print, within: Watch.within, near: near) ?? false)) }
        }
    }

    private func look() {
        guard !looking, Date() >= next, !busy(), Screen.allowed else { return }
        looking = true
        next = Date().addingTimeInterval(everyMs / 1000)
        let screen = self.screen, bar = self.bar
        Task { [weak self] in
            let shot = try? await Screen.picture(of: screen)
            let print = shot.map { Screen.print($0.image, skip: Int(bar * $0.place.scale)) } ?? Data()
            let wanted = await MainActor.run { () -> Bool in
                guard let self, !print.isEmpty, !self.busy() else { return false }
                return self.rounds.report(print, waiting: self.waiting(), most: self.most, within: Watch.within)
            }
            let lines = wanted ? shot.flatMap { try? Screen.read($0.image) } : nil
            await MainActor.run {
                guard let self else { return }
                self.looking = false
                guard let shot, let lines, !self.busy() else { return }
                let path = NSTemporaryDirectory() + "paral-look.jpg"
                guard (try? Screen.saveSmaller(shot.image, to: path, longEdge: self.longEdge)) != nil else { return }
                self.sent += 1
                self.onLook?(path, shot.image.width, shot.image.height, shot.place, lines)
            }
        }
    }
}
