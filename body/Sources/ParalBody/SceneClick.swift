import CoreGraphics
import Foundation

/// The picture of his click, after the design kit's cursor that clicks: the cursor pressed, and two rings that
/// spread from under its tip, come to rest and fade. Paral clicks nothing; this answers a click of his own.
public struct ClickPicture: Equatable {
    /// Where paral's cursor's tip was when he clicked.
    public var x, y: Double
    /// How far the rings have spread, as a share of the time they take, 0 to 1; and how far they have gone, 0 to 1.
    public var spread, gone: Double
}

extension Scene {
    /// Whether a point (in the desktop's points, as the mind gives a mark's box) lies inside a box paral is drawing
    /// at `t`: the mark of a thing to open. The app asks this before it clicks for him, so it clicks nothing paral
    /// has not boxed.
    public func boxed(x: Double, y: Double, at t: Double) -> Bool {
        let here = CGPoint(x: x - origin.x, y: y - origin.y)
        return marks.contains { $0.kind == .box && $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) && here.x >= $0.box.x && here.x <= $0.box.x + $0.box.w && here.y >= $0.box.y && here.y <= $0.box.y + $0.box.h }
    }

    /// Whether a mark waits for his click at `t`: it is the mark of the step a board names. A tick, a strike and a tag
    /// say something of a line (done, passed, a few words) and do not ask for a click, so they never wait.
    func waits(_ mark: Mark, at t: Double) -> Bool {
        ![.tick, .strike, .tag].contains(mark.kind) && boards.contains { $0.id == mark.id && $0.now != nil && $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }
    }

    /// His click, as it happens. Only a click on the mark that waits for it is answered: paral's cursor, which is
    /// resting beside that mark or still drawing it, presses, and rings spread from where its tip is. A click
    /// anywhere else is his own business and draws nothing. Nothing is drawn with motion reduced, when there is no cursor.
    mutating func click(x: Double, y: Double, at: Double) {
        let here = CGPoint(x: x - origin.x, y: y - origin.y), room = max(tokens.mark.boxPadX, tokens.mark.boxPadY)
        guard let mark = marks.last(where: { $0.at <= at && $0.clearedAt == nil && waits($0, at: at) }), let cursor = pointer(at: at), cursor.withWay == nil else { return }
        let on = mark.box.grown(room)
        guard here.x >= on.x, here.x <= on.x + on.w, here.y >= on.y, here.y <= on.y + on.h else { return }
        clicked = (at, cursor.x, cursor.y, "\(mark.id)/\(mark.beat)")
    }

    /// How large the cursor is drawn against its own size: 1, but for a moment at his click, when it presses down
    /// to `cursor.pressTo` in `motion.pressMs` and comes back a little past its size and to rest.
    func press(at t: Double) -> Double {
        guard let clicked, t >= clicked.at else { return 1 }
        let to = tokens.cursor.pressTo, down = max(ms(tokens.motion.pressMs), 1), since = t - clicked.at
        if since < down { return 1 - (1 - to) * tokens.curves.travel(since / down) }
        return to + (1 - to) * tokens.curves.pop((since - down) / max(ms(tokens.motion.usualMs), 1))
    }

    /// The rings of his click: they spread in `cursor.clickMs`, rest for `cursor.clickStayMs`, and go as anything goes.
    func click(at t: Double) -> ClickPicture? {
        guard let clicked, t >= clicked.at else { return nil }
        let spreads = max(ms(tokens.cursor.clickMs), 1), rests = clicked.at + spreads + ms(tokens.cursor.clickStayMs)
        guard t < rests + ms(tokens.motion.leaveMs) else { return nil }
        return ClickPicture(x: clicked.x, y: clicked.y, spread: min((t - clicked.at) / spreads, 1), gone: leaving(since: rests, at: t))
    }
}
