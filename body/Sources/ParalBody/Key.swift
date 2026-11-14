import AppKit
import CoreGraphics

/// The hold key, read by asking the system for the keys' state sixty times a second. It installs no event tap.
public final class Key {
    public enum Which: String { case rightOption, fn, controlOption, shift, control, command }

    private let which: Which
    private var timer: Timer?
    private var held = false
    public var onDown: (() -> Void)?
    public var onUp: (() -> Void)?
    /// Called on every look while the key stays down.
    public var onHeld: (() -> Void)?

    public init(_ which: Which) { self.which = which }

    public static func isDown(_ which: Which) -> Bool {
        let flags = CGEventSource.flagsState(.combinedSessionState)
        switch which {
        // Asked two ways, since neither has been tried in the real app yet: the key's own state, and the Option flag
        // with the bit that says it is the right-hand one (0x40, NX_DEVICERALTKEYMASK).
        case .rightOption: return CGEventSource.keyState(.combinedSessionState, key: 61) || (flags.contains(.maskAlternate) && flags.rawValue & 0x40 != 0)
        case .fn: return flags.contains(.maskSecondaryFn)
        case .controlOption: return flags.contains(.maskControl) && flags.contains(.maskAlternate)
        case .shift: return flags.contains(.maskShift)
        case .control: return flags.contains(.maskControl)
        case .command: return flags.contains(.maskCommand)
        }
    }

    /// Where the pointer is, in display points with the origin at the main display's top-left corner.
    public static var pointer: CGPoint? { CGEvent(source: nil)?.location }

    public func start() {
        let timer = Timer(timeInterval: 1.0 / 60, repeats: true) { [weak self] _ in self?.look() }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    private func look() {
        let down = Key.isDown(which)
        if down != held {
            held = down
            if down { onDown?() } else { onUp?() }
        } else if down {
            onHeld?()
        }
    }
}
