import AppKit

/// Looks at a display with no key pressed. Every so often it takes a picture and reads its lines. When what it read
/// has changed since the last look it reported, and is the same as the round before (so he has stopped scrolling),
/// it reports the look, once. It does not look while `busy` says the key is down, and paral's own window is left
/// out of the picture, so what paral draws never counts as a change. Reading the text is what a look costs, so a
/// picture that is the same as the last one read is not read again: at rest a look is one picture and a compare.
public final class Watch {
    private let screen: NSScreen
    private var timer: Timer?
    private var looking = false
    /// What the round before read, and what the last reported look read, as letters and digits only: the text reader
    /// wobbles on marks and spaces from one picture to the next.
    private var before = ""
    private var reported = ""
    /// The last picture that was read, as its small grey copy, and the lines read from it.
    private var lastRead = (small: Data(), lines: [ReadLine]())
    public var busy: () -> Bool = { false }
    /// A look to send: where its smaller copy was saved, the picture's size, where its display is, and the lines read from it.
    public var onLook: ((String, Int, Int, DisplayPlace, [ReadLine]) -> Void)?
    private var longEdge = 1280.0

    public init(screen: NSScreen) { self.screen = screen }

    /// Starts looking every `everyMs`; zero means never. Starting twice does nothing. `longEdge` is the size of the
    /// copy saved for the mind, in a file of its own that the next look overwrites.
    public func start(everyMs: Double, longEdge: Double) {
        self.longEdge = longEdge
        guard everyMs > 0, timer == nil else { return }
        let timer = Timer(timeInterval: everyMs / 1000, repeats: true) { [weak self] _ in self?.look() }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func look() {
        guard !looking, !busy(), Screen.allowed else { return }
        looking = true
        let screen = self.screen, last = lastRead
        Task { [weak self] in
            var seen: (image: CGImage, place: DisplayPlace, lines: [ReadLine], small: Data)?
            if let (image, place) = try? await Screen.picture(of: screen) {
                let small = Screen.small(image)
                let same = !small.isEmpty && small == last.small
                if let lines = same ? last.lines : try? Screen.read(image) { seen = (image, place, lines, small) }
            }
            let found = seen
            await MainActor.run {
                guard let self else { return }
                self.looking = false
                guard let found, !self.busy() else { return }
                self.lastRead = (found.small, found.lines)
                let read = found.lines.map(\.text).joined(separator: " ").lowercased().filter { $0.isLetter || $0.isNumber }
                defer { self.before = read }
                guard read == self.before, read != self.reported else { return }
                let path = NSTemporaryDirectory() + "paral-look.jpg"
                guard (try? Screen.saveSmaller(found.image, to: path, longEdge: self.longEdge)) != nil else { return }
                self.reported = read
                self.onLook?(path, found.image.width, found.image.height, found.place, found.lines)
            }
        }
    }
}
