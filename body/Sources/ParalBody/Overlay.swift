import AppKit

final class Canvas: NSView {
    var paint: ((CGContext) -> Void)?
    var onDown: ((CGPoint) -> Void)?
    var onUp: ((CGPoint) -> Void)?
    override var isFlipped: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func draw(_ dirty: NSRect) {
        if let ctx = NSGraphicsContext.current?.cgContext { paint?(ctx) }
    }
    override func mouseDown(with event: NSEvent) { onDown?(convert(event.locationInWindow, from: nil)) }
    override func mouseUp(with event: NSEvent) { onUp?(convert(event.locationInWindow, from: nil)) }
}

/// What on the overlay takes a click: the cross on the resting circle, and the nudge card's buttons while it offers them.
public enum Hit: Equatable { case cross, button(NudgeButton) }

/// One see-through window over a display, above everything, that lets every click through. It hosts the painter and
/// redraws only when the picture has changed. What takes a click is what the last picture drew as taking one: the
/// cross on the resting circle, and the nudge card's two buttons while they are up. The window takes the mouse only
/// while the pointer is over one of them. It is a panel that never makes the app active, so a click on a button is
/// taken at the first click and the page he is on keeps the keyboard.
public final class Overlay {
    private let window: NSPanel
    private let canvas: Canvas
    /// Swapped when the tokens file changes, so a dial turned on the dials page shows on the real screen.
    public var painter: Painter
    private var timer: Timer?
    private var shown: Picture?
    /// He clicked the cross, or let go of a button of the nudge card while still on it.
    public var onPress: ((Hit) -> Void)?
    private var stale = false
    public func repaint() { stale = true }
    /// Where each thing that takes a click was drawn last, and the button the mouse went down on, while it is down.
    private var hits: [(hit: Hit, box: Box)] = []
    private var held: Hit?

    public init(screen: NSScreen, painter: Painter, picture: @escaping () -> Picture) {
        self.painter = painter
        window = NSPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        window.hidesOnDeactivate = false
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.ignoresMouseEvents = true
        window.level = .screenSaver
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        canvas = Canvas(frame: NSRect(origin: .zero, size: screen.frame.size))
        window.contentView = canvas
        canvas.paint = { [weak self] ctx in
            guard let self, let shown = self.shown else { return }
            self.hits = self.painter.paint(shown, into: ctx).compactMap { item in
                if item.what == "cross" { return (.cross, item.box) }
                return item.what == "button" ? NudgeButton(rawValue: item.id ?? "").map { (.button($0), item.box) } : nil
            }
        }
        // The cross clears at the press, as it always has; a button is pressed at the press and asks at the release.
        canvas.onDown = { [weak self] point in
            guard let self, let hit = self.hit(at: point) else { return }
            if hit == .cross { self.onPress?(.cross) } else { self.held = hit }
        }
        canvas.onUp = { [weak self] point in
            guard let self, let held = self.held else { return }
            self.held = nil
            if self.hit(at: point) == held { self.onPress?(held) }
        }
        window.orderFrontRegardless()
        let timer = Timer(timeInterval: 1.0 / 60, repeats: true) { [weak self] _ in
            guard let self else { return }
            var now = picture()
            // The clock only matters while something pulses: the thinking dots, or the dots in an empty card.
            if now.capsule.look != .thinking && !(now.board?.rows.isEmpty ?? false) { now.clock = 0 }
            if case .button(let button) = self.held { now.nudge?.held = button }
            let over = self.held != nil || self.hit(at: self.pointer) != nil
            if self.window.ignoresMouseEvents == over { self.window.ignoresMouseEvents = !over }
            guard now != self.shown || self.stale else { return }
            self.stale = false
            self.shown = now
            self.canvas.needsDisplay = true
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    /// What takes a click at this point, if anything: a thing's box a little wider than it is drawn.
    private func hit(at point: CGPoint) -> Hit? {
        hits.first { item in
            let box = item.box.grown(6)
            return CGRect(x: box.x, y: box.y, width: box.w, height: box.h).contains(point)
        }?.hit
    }

    /// The pointer in the canvas's own space: origin top-left, y growing downward.
    private var pointer: CGPoint {
        let inWindow = window.convertPoint(fromScreen: NSEvent.mouseLocation)
        return CGPoint(x: inWindow.x, y: canvas.bounds.height - inWindow.y)
    }
}
