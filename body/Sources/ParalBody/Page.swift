import AppKit

/// Draws lines of text onto a blank page and says where each one is. Used by the checks to make pages with a known truth.
public enum Page {
    public static func draw(lines: [String], to path: String, width: Int = 1600, height: Int = 1000) throws -> [String: Any] {
        let left = 120.0, top = 110.0, gap = 96.0
        guard let page = NSBitmapImageRep(
            bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4,
            hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
            let context = NSGraphicsContext(bitmapImageRep: page)
        else { throw Screen.Failed(why: "could not make a page to draw on") }
        NSGraphicsContext.current = context
        NSColor.white.setFill()
        NSRect(x: 0, y: 0, width: width, height: height).fill()
        let ink: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 40), .foregroundColor: NSColor.black]
        var truth: [[String: Any]] = []
        for (row, text) in lines.enumerated() {
            let size = (text as NSString).size(withAttributes: ink)
            let y = top + Double(row) * gap
            (text as NSString).draw(at: NSPoint(x: left, y: Double(height) - y - size.height), withAttributes: ink)
            truth.append(["text": text, "box": ["x": left, "y": y, "w": Double(size.width), "h": Double(size.height)]])
        }
        context.flushGraphics()
        guard let image = page.cgImage else { throw Screen.Failed(why: "could not finish the page") }
        try Screen.save(image, to: path)
        return ["w": width, "h": height, "lines": truth]
    }
}
