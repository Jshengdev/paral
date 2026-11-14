import AppKit

final class Canvas: NSView {
    var paint: ((CGContext) -> Void)?
    var onClick: ((CGPoint) -> Void)?
    override var isFlipped: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func draw(_ dirty: NSRect) {
        if let ctx = NSGraphicsContext.current?.cgContext { paint?(ctx) }
    }
    override func mouseDown(with event: NSEvent) { onClick?(convert(event.locationInWindow, from: nil)) }
}

/// One see-through window over a display, above everything, that lets every click through. It hosts the painter and
/// redraws only when the picture has changed. The one thing that takes a click is the cross on the resting circle,
/// and only while the pointer is over it.
public final class Overlay {
    private let window: NSWindow
    private let canvas: Canvas
    /// Swapped when the tokens file changes, so a dial turned on the dials page shows on the real screen.
    public var painter: Painter
    private var timer: Timer?
    private var shown: Picture?
    public var onClose: (() -> Void)?
    private var stale = false
    public func repaint() { stale = true }

    public init(screen: NSScreen, painter: Painter, picture: @escaping () -> Picture) {
        self.painter = painter
        window = NSWindow(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.ignoresMouseEvents = true
        window.level = .screenSaver
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        canvas = Canvas(frame: NSRect(origin: .zero, size: screen.frame.size))
        window.contentView = canvas
        canvas.paint = { [weak self] ctx in
            if let self, let shown = self.shown { _ = self.painter.paint(shown, into: ctx) }
        }
        canvas.onClick = { [weak self] point in
            guard let self, self.shown?.capsule.closes == true, self.cross.contains(point) else { return }
            self.onClose?()
        }
        window.orderFrontRegardless()
        let timer = Timer(timeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
            guard let self else { return }
            var now = picture()
            // The clock only matters while something pulses: the thinking dots, or the dots in an empty card.
            if now.capsule.look != .thinking && !(now.board?.rows.isEmpty ?? false) { now.clock = 0 }
            let over = now.capsule.closes && self.cross.contains(self.pointer)
            if self.window.ignoresMouseEvents == over { self.window.ignoresMouseEvents = !over }
            guard now != self.shown || self.stale else { return }
            self.stale = false
            self.shown = now
            self.canvas.needsDisplay = true
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    /// Where the cross can be clicked, a little wider than it is drawn.
    private var cross: CGRect {
        let box = Layout.capsule(open: 0, closes: true, width: painter.width, height: painter.height, tokens: painter.tokens).grown(6)
        return CGRect(x: box.x, y: box.y, width: box.w, height: box.h)
    }

    /// The pointer in the canvas's own space: origin top-left, y growing downward.
    private var pointer: CGPoint {
        let inWindow = window.convertPoint(fromScreen: NSEvent.mouseLocation)
        return CGPoint(x: inWindow.x, y: canvas.bounds.height - inWindow.y)
    }
}
