import AppKit

/// Looks at a display with no key pressed. Every round it takes a picture and makes a small grey print of it, with
/// the menu bar left out: a clock or a recording's timer ticks there, and would make every round look new. `Rounds`
/// says from the prints alone whether the round is a look to report: the page has changed since the last one
/// reported and has stood still for a round, or, while an arrow says the thing is off screen (`waiting`), it has
/// changed at all. Reading the text is what a look costs, so it is read only for a look that is reported. It does
/// not look while the key is down or an answer is being said, and paral's own window is left out of the picture, so
/// what paral draws never counts as a change. While marks are placed it looks twice a second and tells the scene
/// the moment the page is no longer the one they were placed on (`onStale`), so a mark is never left on the wrong words.
public final class Watch {
    /// Two prints with fewer than this share of their points apart are the same page (`Screen.alike`): about a dozen
    /// changed signs on a display. Not measured on a real screen.
    public static let within = 0.0015
    /// How long the mind is given to place marks anew for a look, in seconds, before the marks that are up are taken
    /// to stand. It answers a look of a page it knows in a few thousandths of a second.
    public static let answered = 0.4
    private let screen: NSScreen
    private var timer: Timer?
    private var looking = false
    private var rounds = Rounds()
    /// How many looks have been sent so far, when the picture of the newest was taken, and whether the page had
    /// moved since the look before it. The scroller waits, after each reach, for a look taken once the page had stopped.
    public private(set) var sent = 0, sentTaken = Date.distantPast, sentMoved = true
    private var forcedAt: Date?
    private var next = Date.distantPast
    /// What the app and the scene say now: whether the key is held, and the scene's answer to the watcher
    /// (`Scene.watching`): an ask being heard or answered, which way the scroll arrow points if one is up, and
    /// whether any mark is placed on the page. Nil when the app is gone.
    public var sees: () -> (held: Bool, scene: (busy: Bool, down: Bool?, placed: Bool, markY: Double?))? = { nil }
    /// Told when the page starts or stops being moved away from under paral's marks. While it is, the marks are on
    /// the wrong words and the scene does not draw them.
    public var onStale: ((Bool) -> Void)?
    private var stale = false, placedCount = 0, pendingMoved = true
    /// How often it looks while marks are placed, in seconds: often enough that a mark is off the page within half
    /// a second of the page moving, and back about a second after it stops. Not measured on a real screen.
    public static let placedEvery = 0.5
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
        stale = false
    }

    private func busy() -> Bool { sees().map { $0.held || $0.scene.busy } ?? true }

    /// A line the app has taken. A mark from the mind is for the page as it stands: that page is the one the marks
    /// are on from now, and they are drawn.
    public func saw(_ seen: Seen) {
        guard case .mark = seen else { return }
        rounds.placed()
        placedCount += 1
        stale = false
    }

    /// Asks for a look now, whatever the rounds would say: the next picture is read and sent even if the page has
    /// not changed. The scroller asks for one after each reach, once the page has stopped.
    public func force() {
        forcedAt = Date()
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
        let scene = sees()?.scene, taken = Date()
        next = Date().addingTimeInterval(scene?.placed == true ? min(Watch.placedEvery, everyMs / 1000) : everyMs / 1000)
        let screen = self.screen, bar = self.bar
        Task { [weak self] in
            let shot = try? await Screen.picture(of: screen)
            let print = shot.map { Screen.print($0.image, skip: Int(bar * $0.place.scale)) } ?? Data()
            let wanted = await MainActor.run { () -> Bool in
                guard let self, !print.isEmpty, !self.busy() else { return false }
                // The moment the page is not the one the marks were placed on, the scene is told, and again when it is.
                let moved = scene?.placed == true && self.rounds.stale(print, within: Watch.within)
                if moved != self.stale { self.stale = moved; self.onStale?(moved) }
                // A look asked for by the scroller is sent whatever the rounds say, if its picture was taken after the asking.
                let forced = self.forcedAt.map { taken >= $0 } ?? false
                if forced { self.forcedAt = nil }
                self.pendingMoved = !self.rounds.unmoved(print, within: Watch.within)
                return self.rounds.report(print, waiting: scene?.down != nil, most: self.most, within: Watch.within) || forced
            }
            let lines = wanted ? shot.flatMap { try? Screen.read($0.image) } : nil
            await MainActor.run {
                guard let self else { return }
                self.looking = false
                guard let shot, let lines, !self.busy() else { return }
                let path = NSTemporaryDirectory() + "paral-look.jpg"
                guard (try? Screen.saveSmaller(shot.image, to: path, longEdge: self.longEdge)) != nil else { return }
                (self.sent, self.sentTaken, self.sentMoved) = (self.sent + 1, taken, self.pendingMoved)
                self.onLook?(path, shot.image.width, shot.image.height, shot.place, lines)
                // If the mind places nothing new for this look, the marks stand by its own measure: they are drawn again.
                let before = self.placedCount
                DispatchQueue.main.asyncAfter(deadline: .now() + Watch.answered) { [weak self] in
                    guard let self, self.stale, self.placedCount == before else { return }
                    self.rounds.stands()
                    self.stale = false
                    self.onStale?(false)
                }
            }
        }
    }
}
