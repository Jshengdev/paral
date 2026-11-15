import AppKit

/// The guide's card in a window of its own, so that he sees it on his screen and a recording of the screen does not:
/// it is marked not to be shared (`sharingType = .none`). Like the overlay it lies over the whole display above
/// everything, on every space, never makes the app active, and lets every click through, always. It paints only the
/// guide's card and the arrow that leads to it (`Painter.guide(of:placed:into:)`), from the overlay's own picture.
/// Whether this macOS leaves such a window out of a `screencapture` recording is checked by hand: see body/README.md.
final class GuideWindow {
    private let window: NSPanel
    private let canvas: Canvas
    private var shown: (picture: Picture, placed: [Drawn], painter: Painter)?

    init(screen: NSScreen) {
        window = NSPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        window.hidesOnDeactivate = false
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.ignoresMouseEvents = true
        window.sharingType = .none
        window.level = .screenSaver
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        canvas = Canvas(frame: NSRect(origin: .zero, size: screen.frame.size))
        window.contentView = canvas
        canvas.paint = { [weak self] ctx in
            guard let shown = self?.shown else { return }
            shown.painter.guide(of: shown.picture, placed: shown.placed, into: ctx)
        }
        window.orderFrontRegardless()
    }

    /// Paints the guide's card of a picture the overlay has just painted. It is asked for during the overlay's own
    /// drawing, so this window is drawn just after.
    func show(_ picture: Picture, placed: [Drawn], painter: Painter) {
        guard shown?.picture != picture || shown?.placed != placed else { return }
        shown = (picture, placed, painter)
        DispatchQueue.main.async { [weak self] in self?.canvas.needsDisplay = true }
    }
}
