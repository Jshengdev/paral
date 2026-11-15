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
    /// The print of the round before, of the last look reported, and of the page paral's marks were placed on.
    private var before = Data(), reported = Data(), basis = Data()
    /// How many looks in a row have been reported at once, with no round between in which the page stood still.
    private var hurried = 0

    public init() {}

    /// The print of the latest round: the page as it was last seen, reported or not. Empty before the first round.
    public var latest: Data { before }

    /// Whether a print shows the page as the last look reported saw it: the page has not moved since.
    public func unmoved(_ print: Data, within: Double) -> Bool { Screen.alike(print, reported, within: within) }

    /// Marks have just been placed: the page as the latest round saw it is the page they are on.
    public mutating func placed() { basis = before }

    /// A look was sent while the page had moved under the marks, and the mind placed nothing new for it: by its own
    /// measure they still stand, so the page as that look saw it is the page they are on.
    public mutating func stands() { basis = reported }

    /// Whether the page has moved under the marks: a print that is not the page they were placed on. False while
    /// nothing has been placed. With `band` (how far down the print the newest mark's middle is, 0 to 1) only the rows
    /// round that place are compared, a tenth of the print's height each way: a scroll changes them, and a link
    /// lighting up under the pointer somewhere else does not. `wide` is the print's width in points.
    public func stale(_ print: Data, within: Double, band: Double? = nil, wide: Int = 320) -> Bool {
        guard !basis.isEmpty, basis.count == print.count else { return false }
        guard let band, wide > 0, print.count % wide == 0 else { return !Screen.alike(print, basis, within: within) }
        let rows = print.count / wide, middle = Int((min(max(band, 0), 1) * Double(rows)).rounded(.down)), reach = max(1, rows / 10)
        let from = max(0, middle - reach) * wide, to = min(rows, middle + reach + 1) * wide
        guard from < to else { return false }
        return !Screen.alike(print.subdata(in: from..<to), basis.subdata(in: from..<to), within: max(within, 0.01))
    }

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
