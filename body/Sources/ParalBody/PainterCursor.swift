import AppKit

extension Painter {
    /// The cursor's outline for a tip at the origin and a height of one: the corners of the design kit's arrow before
    /// they are rounded, measured from the kit's own path, in the order it is drawn (tip, the head's left corner, the
    /// notch, the tail's two corners, the other notch, the head's right corner).
    private static let corners: [(x: Double, y: Double)] = [(0, 0), (0.129, 0.856), (0.312, 0.619), (0.573, 1), (0.766, 0.856), (0.477, 0.525), (0.766, 0.461)]
    /// As shares of the cursor's height, from the kit: how round each corner is, where the gradient starts and ends,
    /// where the ripple's middle is, how wide its line is, and how far in the inner ring is.
    private static let round = 0.04, shadeFrom = (x: 0.115, y: 0.056), shadeTo = (x: 0.706, y: 0.669)
    private static let rippleAt = (x: 0.11, y: 0.135), rippleLine = 0.052, innerRing = 0.6

    /// Paral's own cursor, after the kit's: the arrow filled from deep cardinal through cardinal to ember, with a
    /// paper edge so it reads on any page. While the ripple that says "here" spreads, two rings grow out from under
    /// it and fade. It is a picture of a cursor: it moves nothing and clicks nothing.
    /// Gives back the cursor's box, and its name tag's when it wears one.
    func pointer(_ pointer: PointerPicture, clock: Double, _ ctx: CGContext) -> (box: Box, tag: Box?) {
        let c = tokens.cursor
        func at(_ share: (x: Double, y: Double)) -> CGPoint { CGPoint(x: pointer.x + share.x * c.size, y: pointer.y + share.y * c.size) }
        var worn: Box?
        if pointer.thinking { orb(middle: at(Painter.orbAt), across: Painter.orbWide * c.size, clock: clock, ctx) } else if pointer.tag { worn = tag(at: at(Painter.tagAt), grown: pointer.tagGrown, ctx) }
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(pointer.alpha)
        if let spread = pointer.ripple {
            // The kit's still shows the rings part of the way out: the inner one at 0.45, the outer at 0.18.
            let middle = at(Painter.rippleAt)
            ctx.setLineWidth(Painter.rippleLine * c.size)
            for (reach, strength) in [(Painter.innerRing, 0.45), (1.0, 0.18)] {
                let r = c.ripple * reach * tokens.curves.arrive(spread)
                ctx.setStrokeColor(cardinal.copy(alpha: strength * 2 * (1 - tokens.curves.leave(spread))) ?? cardinal)
                ctx.strokeEllipse(in: CGRect(x: middle.x - r, y: middle.y - r, width: 2 * r, height: 2 * r))
            }
        }
        let points = Painter.corners.map(at)
        let shape = CGMutablePath()
        shape.move(to: CGPoint(x: (points[0].x + points[points.count - 1].x) / 2, y: (points[0].y + points[points.count - 1].y) / 2))
        for (index, corner) in points.enumerated() {
            shape.addArc(tangent1End: corner, tangent2End: points[(index + 1) % points.count], radius: Painter.round * c.size)
        }
        shape.closeSubpath()
        ctx.addPath(shape)
        ctx.setStrokeColor(paper)
        ctx.setLineWidth(2 * c.edge)
        ctx.setLineJoin(.round)
        ctx.strokePath()
        ctx.addPath(shape)
        ctx.clip()
        if let shade = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: [cardinalDeep, cardinal, ember] as CFArray, locations: [0, 0.55, 1]) {
            ctx.drawLinearGradient(shade, start: at(Painter.shadeFrom), end: at(Painter.shadeTo), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
        }
        return (Box(x: pointer.x - c.edge, y: pointer.y - c.edge, w: Layout.cursorWide * c.size + 2 * c.edge, h: c.size + 2 * c.edge), worn)
    }

    /// The cursor moved the least that keeps all of it, its paper edge too, on the display. Its tip then leaves the
    /// pen for the last few points of a stroke that ends at an edge, which is better than a cursor cut in half.
    func inside(_ pointer: PointerPicture) -> PointerPicture {
        let c = tokens.cursor
        var kept = pointer
        kept.x = min(max(pointer.x, c.edge), width - Layout.cursorWide * c.size - c.edge)
        kept.y = min(max(pointer.y, c.edge), height - c.size - c.edge)
        return kept
    }

    /// From the kit's cursor page, as shares of the cursor's height: where the tag's corner and the working orb's
    /// middle sit from the tip, how wide the orb is, and the tag's type, its orb and the room round them.
    private static let tagAt = (x: 0.726, y: 0.933), orbAt = (x: 1.114, y: 1.114), orbWide = 0.674
    private static let tagType = 0.389, tagOrb = 0.467, tagPad = (left: 0.207, right: 0.363, y: 0.181), tagGap = 0.207

    /// The kit's orb, drawn in code: a white disc with rings of the cursor's reds and one ring of gold. Alive when a
    /// clock is running (while paral works), which makes the rings breathe.
    func orb(middle: CGPoint, across: Double, clock: Double, _ ctx: CGContext) {
        let r = across / 2
        ctx.saveGState()
        ctx.setShadow(offset: .zero, blur: 3, color: CGColor(gray: 0, alpha: 0.28))
        ctx.setFillColor(CGColor(gray: 1, alpha: 1))
        ctx.fillEllipse(in: CGRect(x: middle.x - r, y: middle.y - r, width: across, height: across))
        ctx.restoreGState()
        ctx.setLineWidth(max(across / 14, 1))
        for (index, colour) in [cardinalDeep, cardinal, gold, ember].enumerated() {
            let share = (Double(index) + 1) / 5 + 0.04 * sin(clock / 260 - Double(index) * 0.8)
            ctx.setStrokeColor(colour)
            ctx.strokeEllipse(in: CGRect(x: middle.x - r * share, y: middle.y - r * share, width: 2 * r * share, height: 2 * r * share))
        }
    }

    /// The cursor's name tag, after the kit's: a light pill with the orb and the name, which says whose cursor this is.
    /// It pops out from its corner by the cursor's tail: `grown` is how far, 0 to 1 and a little past on the way.
    func tag(at corner: CGPoint, grown: Double, _ ctx: CGContext) -> Box {
        let size = tokens.cursor.size, from = tokens.cursor.tagFrom
        let name = inked(tokens.strings.name, size: Painter.tagType * size, color: ink, weight: .medium)
        let words = name.size(), orbWide = Painter.tagOrb * size
        let tall = orbWide + 2 * Painter.tagPad.y * size
        let wide = Painter.tagPad.left * size + orbWide + Painter.tagGap * size + words.width + Painter.tagPad.right * size
        // Under the cursor's tail where there is room, as the kit has it; at an edge of the display it is moved the
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
        orb(middle: CGPoint(x: Painter.tagPad.left * size + orbWide / 2, y: pill.midY), across: orbWide, clock: 0, ctx)
        name.draw(at: CGPoint(x: Painter.tagPad.left * size + orbWide + Painter.tagGap * size, y: pill.midY - words.height / 2))
        return Box(x: at.x, y: at.y, w: wide * scale, h: tall * scale)
    }
}
