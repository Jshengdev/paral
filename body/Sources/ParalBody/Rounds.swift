import CoreGraphics
import Foundation

extension Screen {
    /// A small grey print of a picture, 320 by 200, with a strip at its top left out (`skip`, in the picture's own
    /// points of light: the menu bar, whose clock and timers tick). Enough to tell whether the page has moved or
    /// changed since another print of it, at a fraction of what reading its text costs. Empty when it could not be drawn.
    public static func print(_ image: CGImage, skip: Int = 0) -> Data {
        let w = 320, h = 200, below = max(0, min(skip, image.height - 1))
        guard let page = below == 0 ? image : image.cropping(to: CGRect(x: 0, y: below, width: image.width, height: image.height - below)),
              let context = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
        else { return Data() }
        context.interpolationQuality = .high
        context.draw(page, in: CGRect(x: 0, y: 0, width: w, height: h))
        return context.data.map { Data(bytes: $0, count: w * h) } ?? Data()
    }

    /// Whether two prints show the same page: fewer than `share` of their points differ by more than a twentieth of
    /// the way from black to white. A sign that changes somewhere (a clock, a caret, a counter) is the same page; a
    /// line that changes, a section that opens, or a scroll of a few points is not. Two empty prints, or prints of
    /// two sizes, are never alike.
    public static func alike(_ one: Data, _ other: Data, within share: Double) -> Bool {
        guard !one.isEmpty, one.count == other.count else { return false }
        var apart = 0
        for (a, b) in zip(one, other) where abs(Int(a) - Int(b)) > 12 { apart += 1 }
        return Double(apart) < share * Double(one.count)
    }
}

/// What the watcher decides round by round, from prints of the display alone. Ordinarily a round is reported as a
/// look when the page has changed since the last look reported and is the same as the round before, so he has
/// stopped scrolling. While something of paral's is placed on the page (`waiting`: a mark, or the arrow that says the
/// thing is off screen), a round is reported at once when the page has changed, so what is drawn keeps up with a
/// page that is moving and a mark lands as its thing comes into view. At most `most` looks are sent that way in a
/// row; then the page must stand still once before more are.
public struct Rounds {
    /// The print of the round before, and of the last look reported.
    private var before = Data(), reported = Data()
    /// How many looks in a row have been reported at once, with no round between in which the page stood still.
    private var hurried = 0

    public init() {}

    /// Whether a print shows the page as the last look reported saw it, and, round a place of it (`near`, as shares
    /// of the print across and down), exactly so: in the 49 by 25 points round that place not one in a hundred may
    /// differ. A small thing that has come up over the place since the look is then not taken for the same page.
    public func isLast(_ print: Data, within: Double, near: (x: Double, y: Double)) -> Bool {
        guard Screen.alike(print, reported, within: within) else { return false }
        let w = 320, h = 200, cx = Int(near.x * Double(w)), cy = Int(near.y * Double(h))
        var apart = 0, counted = 0
        for y in max(0, cy - 12)...min(h - 1, max(0, cy + 12)) {
            for x in max(0, cx - 24)...min(w - 1, max(0, cx + 24)) {
                counted += 1
                if abs(Int(print[y * w + x]) - Int(reported[y * w + x])) > 12 { apart += 1 }
            }
        }
        return apart * 100 < counted
    }

    /// Takes one round's print; true when it is to be read and reported as a look.
    public mutating func report(_ print: Data, waiting: Bool, most: Int, within: Double) -> Bool {
        let changed = !Screen.alike(print, reported, within: within), still = Screen.alike(print, before, within: within)
        defer { before = print }
        // A page that stands still, or nothing to keep up with, ends a run of looks sent at once.
        if still || !waiting { hurried = 0 }
        guard changed, still || (waiting && hurried < most) else { return false }
        if !still { hurried += 1 }
        reported = print
        return true
    }
}
