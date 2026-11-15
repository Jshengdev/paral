import AppKit

extension Painter {
    /// As shares of the cursor's frame, from the design kit's cursor, whose frame is 36 with its tip at (3.6, 3.6):
    /// where the middle of the ripple's rings is from the tip (the kit's (8, 8)), how wide their line is (2), and how
    /// far in the inner ring is (42 across against the outer's 70).
    private static let rippleAt = 4.4 / 36, rippleLine = 2.0 / 36, innerRing = 0.6

    /// Paral's own cursor, after the kit's: the logo mark, with its tip on the place it points at. While the ripple
    /// that says "here" spreads, two rings grow out from under its tip and fade. While paral works it breathes: it
    /// swells about its middle and comes back. It is a picture of a cursor: it moves nothing and clicks nothing.
    /// Gives back the cursor's box, and its name tag's when it wears one.
    func pointer(_ pointer: PointerPicture, clock: Double, _ ctx: CGContext) -> (box: Box, tag: Box?) {
        let c = tokens.cursor
        let frame = Layout.cursor(tip: CGPoint(x: pointer.x, y: pointer.y), size: c.size)
        var worn: Box?
        if pointer.tag { worn = tag(at: CGPoint(x: frame.x + Painter.tagAt.x * c.size, y: frame.y + Painter.tagAt.y * c.size), grown: pointer.tagGrown, ctx) }
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(pointer.alpha)
        if let spread = pointer.ripple {
            // The kit's still shows the rings part of the way out: the inner one at 0.45, the outer at 0.18.
            let middle = CGPoint(x: pointer.x + Painter.rippleAt * c.size, y: pointer.y + Painter.rippleAt * c.size)
            ctx.setLineWidth(Painter.rippleLine * c.size)
            for (reach, strength) in [(Painter.innerRing, 0.45), (1.0, 0.18)] {
                let r = c.ripple * reach * tokens.curves.arrive(spread)
                ctx.setStrokeColor(cardinal.copy(alpha: strength * 2 * (1 - tokens.curves.leave(spread))) ?? cardinal)
                ctx.strokeEllipse(in: CGRect(x: middle.x - r, y: middle.y - r, width: 2 * r, height: 2 * r))
            }
        }
        let swollen = frame.grown(c.size * c.workGrows * pointer.working / 2)
        logo(in: CGRect(x: swollen.x, y: swollen.y, width: swollen.w, height: swollen.h), ctx)
        return (swollen, worn)
    }

    /// The cursor moved the least that keeps all of its frame on the display, at the size it has just then. Its tip
    /// then leaves the pen for the last few points of a stroke that ends at an edge, which is better than a cursor
    /// cut in half.
    func inside(_ pointer: PointerPicture) -> PointerPicture {
        let c = tokens.cursor, swell = c.size * c.workGrows * pointer.working / 2
        let before = Layout.cursorTip * c.size + swell, after = (1 - Layout.cursorTip) * c.size + swell
        var kept = pointer
        kept.x = min(max(pointer.x, before), width - after)
        kept.y = min(max(pointer.y, before), height - after)
        return kept
    }

    /// From the kit's cursor, as shares of the cursor's frame of 36: where the tag's corner sits from the frame's
    /// corner (26, 30), its type (15), the logo in it (18), the room round them (8 on the left, 14 on the right, 7
    /// above and below) and the gap between the two (8).
    private static let tagAt = (x: 26.0 / 36, y: 30.0 / 36)
    private static let tagType = 15.0 / 36, tagLogo = 18.0 / 36, tagPad = (left: 8.0 / 36, right: 14.0 / 36, y: 7.0 / 36), tagGap = 8.0 / 36

    /// The cursor's name tag, after the kit's: a light pill with the logo and the name, which says whose cursor this is.
    /// It pops out from its corner by the cursor: `grown` is how far, 0 to 1 and a little past on the way.
    func tag(at corner: CGPoint, grown: Double, _ ctx: CGContext) -> Box {
        let size = tokens.cursor.size, from = tokens.cursor.tagFrom
        let name = inked(tokens.strings.name, size: Painter.tagType * size, color: ink, weight: .medium)
        let words = name.size(), logoWide = Painter.tagLogo * size
        let tall = logoWide + 2 * Painter.tagPad.y * size
        let wide = Painter.tagPad.left * size + logoWide + Painter.tagGap * size + words.width + Painter.tagPad.right * size
        // Under the cursor where there is room, as the kit has it; at an edge of the display it is moved the
        // least that keeps all of it, the band round it too, on the display, at the size it has just then.
        let edge = tokens.band + 1, scale = from + (1 - from) * grown
        let at = CGPoint(x: max(edge, min(corner.x, width - wide * scale - edge)), y: max(edge, min(corner.y, height - tall * scale - edge)))
        let pill = CGRect(x: 0, y: 0, width: wide, height: tall)
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.translateBy(x: at.x, y: at.y)
        ctx.scaleBy(x: scale, y: scale)
        ctx.setAlpha(min(max(grown, 0), 1))
        surface(CGPath(roundedRect: pill, cornerWidth: tall / 2, cornerHeight: tall / 2, transform: nil), ctx)
        logo(middle: CGPoint(x: Painter.tagPad.left * size + logoWide / 2, y: pill.midY), across: logoWide, ctx)
        name.draw(at: CGPoint(x: Painter.tagPad.left * size + logoWide + Painter.tagGap * size, y: pill.midY - words.height / 2))
        return Box(x: at.x, y: at.y, w: wide * scale, h: tall * scale)
    }
}
