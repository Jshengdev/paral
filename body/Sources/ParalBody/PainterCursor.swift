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
    func pointer(_ pointer: PointerPicture, _ ctx: CGContext) -> Box {
        let c = tokens.cursor
        func at(_ share: (x: Double, y: Double)) -> CGPoint { CGPoint(x: pointer.x + share.x * c.size, y: pointer.y + share.y * c.size) }
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(pointer.alpha)
        if let spread = pointer.ripple {
            // The kit's still shows the rings part of the way out: the inner one at 0.45, the outer at 0.18.
            let middle = at(Painter.rippleAt)
            ctx.setLineWidth(Painter.rippleLine * c.size)
            for (reach, strength) in [(Painter.innerRing, 0.45), (1.0, 0.18)] {
                let r = c.ripple * reach * Motion.land(spread)
                ctx.setStrokeColor(cardinal.copy(alpha: strength * 2 * (1 - Motion.ease(spread))) ?? cardinal)
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
        return Box(x: pointer.x - c.edge, y: pointer.y - c.edge, w: Layout.cursorWide * c.size + 2 * c.edge, h: c.size + 2 * c.edge)
    }
}
