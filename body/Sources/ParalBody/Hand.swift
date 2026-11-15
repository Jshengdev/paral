import AppKit
import ApplicationServices

/// What the app does in another app for him, with the wheel and the button. It does these only after he has asked
/// ("Scroll for me", "Open it for me"), and only these: turns of the wheel sent to the app in front, as his own
/// wheel would send them, and one click at a point the mind names, which is a heading paral has itself boxed. It
/// needs his Accessibility grant, which macOS gives only in System Settings; without it nothing is sent.
public enum Hand {
    public static let off = "that is not allowed yet: switch paral on under Privacy & Security, Accessibility, then ask again"
    public static let stuck = "the page did not move when I scrolled it; scroll it yourself and I will mark the place"
    public static let missed = "I could not click there; open it yourself and I will mark the line"
    public static let moved = "the page moved since I marked that heading, so I did not click; ask again in a moment"
    /// How far one turn moves the page, in points, and how many turns a second. Not measured on a real screen.
    public static let turn = 24.0, perSecond = 30.0
    /// How far it scrolls before it stops to look, as a share of the display's height: less than a whole display,
    /// so a line cannot pass through unseen. Then how long it lets a look be answered, how long it waits for a look
    /// before it takes the page to have stopped moving, and the longest it goes on for one ask, all in seconds.
    public static let reach = 0.5, answered = 0.35, patience = 2.5, longest = 30.0
    /// How long the pointer rests where it will click before the button goes down, in seconds: paral's own window
    /// takes clicks while the pointer is on one of its buttons, and lets them through again once it has left.
    public static let rests = 0.2

    /// Whether macOS lets the app send movements to other apps. With `ask`, macOS shows its own prompt, once, when not.
    public static func trusted(ask: Bool) -> Bool {
        AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: ask] as CFDictionary)
    }

    /// One turn of the wheel, down or up, sent to the app in front as if turned over the middle of `screen`. False
    /// when no other app is in front or the turn could not be made.
    @discardableResult public static func scroll(down: Bool, on screen: NSScreen) -> Bool {
        guard let front = NSWorkspace.shared.frontmostApplication, front.processIdentifier != ProcessInfo.processInfo.processIdentifier,
              let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: Int32(down ? -turn : turn), wheel2: 0, wheel3: 0)
        else { return false }
        if let (_, place, size) = Screen.place(of: screen) { event.location = CGPoint(x: place.x + size.width / 2, y: place.y + size.height / 2) }
        event.postToPid(front.processIdentifier)
        return true
    }

    /// One click of the left button at a point of `screen` (points from its top-left), as his own click would be:
    /// the pointer goes there, rests, and the button goes down and up. False when the point is not on the display.
    public static func press(x: Double, y: Double, on screen: NSScreen) -> Bool {
        guard let (_, place, size) = Screen.place(of: screen), x >= 0, y >= 0, x <= size.width, y <= size.height else { return false }
        let at = CGPoint(x: place.x + x, y: place.y + y)
        func event(_ type: CGEventType) -> CGEvent? { CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: at, mouseButton: .left) }
        guard let move = event(.mouseMoved), let down = event(.leftMouseDown), let up = event(.leftMouseUp) else { return false }
        move.post(tap: .cghidEventTap)
        DispatchQueue.main.asyncAfter(deadline: .now() + rests) {
            down.post(tap: .cghidEventTap)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { up.post(tap: .cghidEventTap) }
        }
        return true
    }
}
