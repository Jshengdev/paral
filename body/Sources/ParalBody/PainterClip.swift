import AVFoundation
import AppKit

/// Frames of a lesson clip, read from its file as they are asked for. The last frame given is kept, so a picture
/// that has not moved on costs nothing.
final class ClipFrames {
    private var makers: [String: AVAssetImageGenerator] = [:]
    private var stills: [String: CGImage] = [:]
    private var last: (key: String, image: CGImage)?

    func frame(of path: String, at seconds: Double) -> CGImage? {
        let key = "\(path)@\(seconds)"
        if let last, last.key == key { return last.image }
        if makers[path] == nil, FileManager.default.fileExists(atPath: path) {
            let maker = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: path)))
            maker.requestedTimeToleranceBefore = CMTime(value: 1, timescale: 30)
            maker.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 30)
            makers[path] = maker
        }
        guard let image = try? makers[path]?.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil) else { return nil }
        last = (key, image)
        return image
    }

    func still(_ path: String) -> CGImage? {
        if let known = stills[path] { return known }
        let image = try? Screen.load(path)
        stills[path] = image
        return image
    }
}

extension Painter {
    /// A lesson clip in the board's place: a dark card, and inside it the clip's frame for this moment. Before the
    /// clip can be read, its first still; with neither, the empty card.
    func clip(_ clip: ClipPicture, _ ctx: CGContext) -> Box {
        let b = tokens.board
        let w = min(clip.room.w, b.maxWidth), h = min(clip.room.h, w * 9 / 16 + 2 * b.pad)
        let inner = min(w - 2 * b.pad, (h - 2 * b.pad) * 16 / 9)
        let card = CGRect(x: clip.room.x + (clip.room.w - (inner + 2 * b.pad)) / 2, y: clip.room.y + (clip.room.h - (inner * 9 / 16 + 2 * b.pad)) / 2, width: inner + 2 * b.pad, height: inner * 9 / 16 + 2 * b.pad)
        ctx.saveGState()
        ctx.setAlpha(clip.appear)
        ctx.addPath(CGPath(roundedRect: card, cornerWidth: b.radius, cornerHeight: b.radius, transform: nil))
        ctx.setFillColor(ink.copy(alpha: 0.96) ?? ink)
        ctx.fillPath()
        let screen = card.insetBy(dx: b.pad, dy: b.pad)
        if let image = frames.frame(of: clip.path, at: clip.second) ?? frames.still(clip.still) {
            // The painter's space has y growing downward; an image is drawn the other way up, so it is turned back.
            ctx.translateBy(x: screen.minX, y: screen.maxY)
            ctx.scaleBy(x: 1, y: -1)
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: screen.width, height: screen.height))
        }
        ctx.restoreGState()
        return Box(x: card.minX, y: card.minY, w: card.width, h: card.height)
    }
}
