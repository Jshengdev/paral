import AppKit
import ApplicationServices

/// Scrolling a page for him. The app does this only after he has asked ("Scroll for me"), and only this: turns of
/// the wheel sent to the app in front, as his own wheel would send them. It needs his Accessibility grant, which
/// macOS gives only in System Settings; without it nothing is sent.
public enum Scroll {
    public static let off = "scrolling for you is not allowed yet: switch paral on under Privacy & Security, Accessibility, then press Scroll for me again"
    public static let stuck = "the page did not move when I scrolled it; scroll it yourself and I will mark the place"
    /// How far one turn moves the page, in points, and how many turns a second. Not measured on a real screen.
    public static let turn = 24.0, perSecond = 30.0
    /// How far it scrolls before it stops to look, as a share of the display's height: less than a whole display,
    /// so a line cannot pass through unseen. Then how long it lets a look be answered, how long it waits for a look
    /// before it takes the page to have stopped moving, and the longest it goes on for one ask, all in seconds.
    public static let reach = 0.5, answered = 0.35, patience = 2.5, longest = 30.0

    /// Whether macOS lets the app send movements to other apps. With `ask`, macOS shows its own prompt, once, when not.
    public static func trusted(ask: Bool) -> Bool {
        AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: ask] as CFDictionary)
    }

    /// One turn of the wheel, down or up, sent to the app in front as if turned over the middle of `screen`. False
    /// when no other app is in front or the turn could not be made.
    @discardableResult public static func step(down: Bool, on screen: NSScreen) -> Bool {
        guard let front = NSWorkspace.shared.frontmostApplication, front.processIdentifier != ProcessInfo.processInfo.processIdentifier,
              let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: Int32(down ? -turn : turn), wheel2: 0, wheel3: 0)
        else { return false }
        if let (_, place, size) = Screen.place(of: screen) { event.location = CGPoint(x: place.x + size.width / 2, y: place.y + size.height / 2) }
        event.postToPid(front.processIdentifier)
        return true
    }
}
