import AppKit

extension Film {
    /// One moment of a recorded run painted the two ways the app paints it: the overlay with the guide's card left
    /// out, and the guide's card alone in its own window. Gives back where the card is, and how many pixels carry
    /// ink: in the overlay's painting inside the card, and in the card's own painting inside it and outside it
    /// (beyond `margin`, the room its shadow takes). For rows; nothing is shown.
    public static func apart(run: String, tokens: Tokens, at moment: Double, margin: Double) throws -> [String: Any] {
        let run = try load(URL(fileURLWithPath: run), tokens: tokens)
        var scene = Scene(width: run.w, height: run.h, tokens: tokens)
        for event in run.events where event.at <= moment { scene.take(event.seen, at: event.at) }
        let picture = scene.picture(at: moment)
        var overlay = Painter(tokens: tokens, width: run.w, height: run.h)
        overlay.leavesOutGuide = true
        var placed: [Drawn] = []
        let main = clear(run.w, run.h) { placed = overlay.paint(picture, into: $0) }
        let alone = clear(run.w, run.h) { Painter(tokens: tokens, width: run.w, height: run.h).guide(of: picture, placed: placed, into: $0) }
        guard let card = placed.first(where: { $0.what == "guide" })?.box else { return ["guide": NSNull(), "overlayInk": inked(main) { _, _ in true }] }
        let near = card.grown(margin)
        func inside(_ b: Box) -> (Int, Int) -> Bool { { x, y in Double(x) >= b.x && Double(x) < b.x + b.w && Double(y) >= b.y && Double(y) < b.y + b.h } }
        return ["guide": card.json, "overlayInk": inked(main) { _, _ in true }, "overlayInkOnTheCard": inked(main, where: inside(card)),
                "cardInkOnTheCard": inked(alone, where: inside(card)), "cardInkElsewhere": inked(alone) { !inside(near)($0, $1) }]
    }

    /// A clear picture of the display with `draw` painted on it, origin top-left and y growing downward.
    private static func clear(_ w: Double, _ h: Double, _ draw: (CGContext) -> Void) -> CGContext {
        let ctx = CGContext(data: nil, width: Int(w), height: Int(h), bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.translateBy(x: 0, y: h)
        ctx.scaleBy(x: 1, y: -1)
        draw(ctx)
        return ctx
    }

    /// How many pixels of a painting carry ink where `place` holds, counting from its top-left corner, which is the
    /// first row of the painting's memory.
    private static func inked(_ ctx: CGContext, where place: (Int, Int) -> Bool) -> Int {
        guard let data = ctx.data?.assumingMemoryBound(to: UInt8.self) else { return 0 }
        var count = 0
        for y in 0..<ctx.height { for x in 0..<ctx.width where data[y * ctx.bytesPerRow + x * 4 + 3] > 0 && place(x, y) { count += 1 } }
        return count
    }
}
