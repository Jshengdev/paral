import AppKit
import ImageIO
import ScreenCaptureKit
import UniformTypeIdentifiers
import Vision

public enum Screen {
    public struct Failed: Error { public let why: String }

    public static var allowed: Bool { CGPreflightScreenCaptureAccess() }
    public static func ask() { CGRequestScreenCaptureAccess() }

    public static func place(of screen: NSScreen) -> (id: CGDirectDisplayID, place: DisplayPlace, size: CGSize)? {
        guard let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else { return nil }
        let id = CGDirectDisplayID(number.uint32Value)
        let bounds = CGDisplayBounds(id)
        return (id, DisplayPlace(id: Int(id), scale: Double(screen.backingScaleFactor), x: Double(bounds.minX), y: Double(bounds.minY)), bounds.size)
    }

    /// One picture of a display, with this app's own windows left out.
    public static func picture(of screen: NSScreen) async throws -> (image: CGImage, place: DisplayPlace) {
        guard let (id, place, size) = place(of: screen) else { throw Failed(why: "that display cannot be found") }
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        guard let display = content.displays.first(where: { $0.displayID == id }) else { throw Failed(why: "that display cannot be captured") }
        let own = content.applications.filter { $0.processID == ProcessInfo.processInfo.processIdentifier }
        let filter = SCContentFilter(display: display, excludingApplications: own, exceptingWindows: [])
        let config = SCStreamConfiguration()
        config.width = Int(size.width * place.scale)
        config.height = Int(size.height * place.scale)
        config.showsCursor = false
        return (try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config), place)
    }

    public static func read(_ image: CGImage) throws -> [ReadLine] {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        try VNImageRequestHandler(cgImage: image).perform([request])
        let width = Double(image.width)
        let height = Double(image.height)
        return (request.results ?? []).compactMap { seen in
            guard let text = seen.topCandidates(1).first?.string else { return nil }
            let box = seen.boundingBox
            return ReadLine(text: text, box: Box(
                x: Double(box.minX) * width, y: (1 - Double(box.maxY)) * height,
                w: Double(box.width) * width, h: Double(box.height) * height))
        }
    }

    public static func save(_ image: CGImage, to path: String) throws {
        let url = URL(fileURLWithPath: path)
        guard let out = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            throw Failed(why: "could not open \(path) for the picture")
        }
        CGImageDestinationAddImage(out, image, nil)
        guard CGImageDestinationFinalize(out) else { throw Failed(why: "could not write the picture to \(path)") }
    }

    /// The copy that goes to the brain: scaled so its longer side is at most `longEdge`, saved as a JPEG.
    public static func saveSmaller(_ image: CGImage, to path: String, longEdge: Double) throws {
        let scale = min(1, longEdge / Double(max(image.width, image.height)))
        let width = Int(Double(image.width) * scale), height = Int(Double(image.height) * scale)
        guard let context = CGContext(
            data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
        else { throw Failed(why: "could not scale the picture") }
        context.interpolationQuality = .high
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        guard let small = context.makeImage(),
              let out = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.jpeg.identifier as CFString, 1, nil)
        else { throw Failed(why: "could not open \(path) for the picture") }
        CGImageDestinationAddImage(out, small, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
        guard CGImageDestinationFinalize(out) else { throw Failed(why: "could not write the picture to \(path)") }
    }

    /// The same picture with his path drawn on it, so the model sees what he drew around. `points` are display
    /// points; they are moved into the picture's own pixels here.
    public static func withPath(_ image: CGImage, _ points: [CGPoint], on display: DisplayPlace, color: CGColor, width: Double) -> CGImage {
        guard points.count > 1, let ctx = CGContext(
            data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
        else { return image }
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        ctx.translateBy(x: 0, y: Double(image.height))
        ctx.scaleBy(x: 1, y: -1)
        ctx.setStrokeColor(color)
        ctx.setLineWidth(width * display.scale)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        ctx.addLines(between: points.map { CGPoint(x: (Double($0.x) - display.x) * display.scale, y: (Double($0.y) - display.y) * display.scale) })
        ctx.strokePath()
        return ctx.makeImage() ?? image
    }

    /// What the mind is given when he drew around something: the picture with his path on it, cut down to the part
    /// he drew around and some room on every side, and the lines with the words of every line outside that part
    /// taken out. The lines keep their places and their order, so a mark still lands and a number still means the
    /// same line. The room is `share` of the loop's own size or `points`, whichever is more.
    public static func around(_ image: CGImage, lines: [ReadLine], path: [CGPoint], on display: DisplayPlace, share: Double, points: Double, color: CGColor, width: Double) -> (image: CGImage, lines: [ReadLine]) {
        let marked = withPath(image, path, on: display, color: color, width: width)
        let xs = path.map { (Double($0.x) - display.x) * display.scale }, ys = path.map { (Double($0.y) - display.y) * display.scale }
        guard let left = xs.min(), let right = xs.max(), let top = ys.min(), let bottom = ys.max() else { return (marked, lines) }
        let roomX = max(share * (right - left), points * display.scale), roomY = max(share * (bottom - top), points * display.scale)
        let part = CGRect(x: left - roomX, y: top - roomY, width: right - left + 2 * roomX, height: bottom - top + 2 * roomY)
            .intersection(CGRect(x: 0, y: 0, width: image.width, height: image.height)).integral
        guard !part.isEmpty, let cut = marked.cropping(to: part) else { return (marked, lines) }
        let kept = lines.map { line -> ReadLine in
            let box = CGRect(x: line.box.x, y: line.box.y, width: line.box.w, height: line.box.h)
            return box.intersects(part) ? line : ReadLine(text: "", box: line.box)
        }
        return (cut, kept)
    }

    public static func load(_ path: String) throws -> CGImage {
        guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
        else { throw Failed(why: "could not read a picture at \(path)") }
        return image
    }
}
