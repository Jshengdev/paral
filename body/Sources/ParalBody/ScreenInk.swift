import CoreGraphics
import Foundation

/// The page's own ink at the foot of the display: whatever the page draws there (words the reader did not read, a
/// drawing, a rule). The scene is told of it beside the read lines; the pill stays at the bottom centre whatever is
/// under it, and the ink is kept for an arrow to keep off a drawing. It never crosses the seam.
extension Screen {
    /// How many cells across the picture is looked at in, each as wide as it is tall; and how far a cell's grey may be
    /// from the page's own before it counts as ink, of 255. A cell is about 12 pixels of a Retina picture of a laptop's
    /// display (6 points), so a line 2 pixels thick moves its cell's grey by about 40. Chosen, not measured.
    static let inkCells = 288, inkDiff = 12

    /// The boxes of the page's ink below `share` of the picture's height (0 is its top), in the picture's own pixels as
    /// the read lines' boxes are. The page's own grey is the most common grey there; a cell further from it than
    /// `inkDiff` is ink. The cells of a row that touch are one box, and a box that runs on down the next rows the
    /// same width is one box too, so the list stays short.
    public static func inked(_ image: CGImage, below share: Double) -> [Box] {
        let cell = Double(image.width) / Double(inkCells)
        let w = inkCells, h = max(1, Int((Double(image.height) / cell).rounded(.up)))
        guard let context = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue),
              let data = context.data?.assumingMemoryBound(to: UInt8.self) else { return [] }
        context.interpolationQuality = .medium
        context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        let first = min(max(0, Int(share * Double(h))), h)
        guard first < h else { return [] }
        var counts = [Int](repeating: 0, count: 256)
        for i in (first * w)..<(h * w) { counts[Int(data[i])] += 1 }
        let page = counts.indices.max { counts[$0] < counts[$1] } ?? 255
        var open: [Int: Box] = [:], done: [Box] = []
        for row in first..<h {
            var runs: [Int: Box] = [:]
            var col = 0
            while col < w {
                guard abs(Int(data[row * w + col]) - page) > inkDiff else { col += 1; continue }
                let from = col
                while col < w, abs(Int(data[row * w + col]) - page) > inkDiff { col += 1 }
                let key = from * 10000 + col
                runs[key] = open[key].map { Box(x: $0.x, y: $0.y, w: $0.w, h: $0.h + cell) } ?? Box(x: Double(from) * cell, y: Double(row) * cell, w: Double(col - from) * cell, h: cell)
            }
            done += open.filter { runs[$0.key] == nil }.map(\.value)
            open = runs
        }
        return done + Array(open.values)
    }

    /// The read lines and, for the scene's laying out only, a line with no words for each box of the page's ink below
    /// `share` of the picture's height. `width` is how wide the picture was that the lines were read at, when not this one.
    public static func taken(_ image: CGImage, _ lines: [ReadLine], below share: Double, width: Double? = nil) -> [ReadLine] {
        let scale = (width ?? Double(image.width)) / Double(image.width)
        return lines + inked(image, below: share).map { ReadLine(text: "", box: Box(x: $0.x * scale, y: $0.y * scale, w: $0.w * scale, h: $0.h * scale)) }
    }

    /// The same, for a picture saved at `path`, whose lines were read at `width` pixels across. The lines alone when it cannot be read.
    public static func taken(_ path: String, _ width: Int, _ lines: [ReadLine], below share: Double) -> [ReadLine] {
        if let image = try? load(path) { return taken(image, lines, below: share, width: Double(width)) }
        FileHandle.standardError.write(Data("paral: the look's picture at \(path) could not be read, so the page's ink at the foot is not kept off\n".utf8))
        return lines
    }
}
