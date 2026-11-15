import AppKit
import ApplicationServices

/// What the app does in another app for him, with the wheel and the button. It does these only after he has asked
/// ("Scroll for me", "Open it for me"), and only these: turns of the wheel sent to the app in front, as his own
/// wheel would send them, and one click at a point the mind names, which is a heading paral has itself boxed. It
/// needs his Accessibility grant, which macOS gives only in System Settings; without it nothing is sent.
public enum Hand {
    public static let off = "that is not allowed yet: switch paral on under Privacy & Security, Accessibility, then ask again"
    public static let stuck = "the page did not move when I scrolled it; scroll it yourself and I will mark the place"
    public static let lost = "I went past it twice, so I stopped; scroll to it yourself and I will mark the place"
    public static let missed = "I could not click there; open it yourself and I will mark the line"
    public static let moved = "the page moved since I marked that heading, so I did not click; ask again in a moment"
    public static let unmarked = "I click only a heading I have boxed, and that place is not one; nothing was clicked"
    /// How many turns of the wheel a second, and how long one reach takes, in seconds. Not measured on a real screen.
    public static let perSecond = 60.0, reachTakes = 0.7
    /// How far it scrolls before it stops to look, as a share of the display's height: well under a whole display,
    /// so a line cannot pass through unseen. Then, in seconds: how long it lets the page come to rest after a reach
    /// before it asks for a look; how long it lets that look be answered; how long it waits for the look before it
    /// gives up; and the longest it goes on for one ask.
    public static let reach = 0.4, settle = 0.35, answered = 0.35, patience = 3.0, longest = 30.0
    /// Where a mark should not be left when the scrolling ends, as shares of the display's height from its top: above
    /// `high` it is under the browser's own bar, below `low` it is at the foot under the orb. Then one more small move
    /// brings it to `rest`.
    public static let high = 0.12, low = 0.7, rest = 0.35
    /// How long the pointer rests where it will click before the button goes down, in seconds: paral's own window
    /// takes clicks while the pointer is on one of its buttons, and lets them through again once it has left.
    public static let rests = 0.2

    /// Whether macOS lets the app send movements to other apps. With `ask`, macOS shows its own prompt, once, when not.
    public static func trusted(ask: Bool) -> Bool {
        AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: ask] as CFDictionary)
    }

    /// Puts the pointer over the page, at the middle of `screen`: a turn of the wheel goes to whatever window is under
    /// the pointer, and when he has just pressed "Scroll for me" the pointer is on paral's own button. False when the
    /// display cannot be found.
    @discardableResult public static func aim(on screen: NSScreen) -> Bool {
        guard let (_, place, size) = Screen.place(of: screen) else { return false }
        let middle = CGPoint(x: place.x + size.width / 2, y: place.y + size.height * 0.45)
        guard let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: middle, mouseButton: .left) else { return false }
        move.post(tap: .cghidEventTap)
        return true
    }

    /// One turn of the wheel by `points`, down or up, sent the way his own wheel's turns arrive, so the window under
    /// the pointer takes it. A turn posted straight to an app's process is ignored by Chrome: that was tried first, on
    /// his screen, and the page did not move. False when the turn could not be made.
    @discardableResult public static func scroll(down: Bool, by points: Double) -> Bool {
        let turn = Int32(max(1, points.rounded()))
        guard let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: down ? -turn : turn, wheel2: 0, wheel3: 0) else { return false }
        event.post(tap: .cghidEventTap)
        return true
    }

    /// A reach of `points` as its turns, in order: small at each end and largest in the middle, as a hand's are, and
    /// adding up to the reach.
    public static func eased(_ points: Double, turns: Int) -> [Double] {
        let weights = (0..<max(turns, 1)).map { sin(Double.pi * (Double($0) + 0.5) / Double(max(turns, 1))) }
        let whole = weights.reduce(0, +)
        return weights.map { abs(points) * $0 / whole }
    }

    /// One click of the left button at a point of `screen`, as his own click would be: the pointer goes there,
    /// rests, and the button goes down and up. The point is in the desktop's points, as a mark's box is (a second
    /// display does not begin at zero). False when the point is not on that display.
    public static func press(x: Double, y: Double, on screen: NSScreen) -> Bool {
        guard let (_, place, size) = Screen.place(of: screen), x >= place.x, y >= place.y, x <= place.x + size.width, y <= place.y + size.height else { return false }
        let at = CGPoint(x: x, y: y)
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
