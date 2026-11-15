import AppKit

extension Painter {
    /// Inks a mark as far as it has been drawn, and writes its label once the ink is whole. Gives back the mark's
    /// box, or nothing while no ink is down yet.
    func mark(_ mark: MarkPicture, avoiding texts: [Box], _ ctx: CGContext) -> Box? {
        guard mark.drawn > 0 else { return nil }
        let points = Pen.path(of: mark, tokens: tokens, avoiding: texts)
        // The design kit's two ways to show a place. A ring or a line is drawn by hand, in ember. A box is the kit's
        // neat highlight: a thinner cardinal edge, and a faint wash of cardinal that comes up as the edge is drawn.
        let boxed = mark.kind == .box
        if boxed, tokens.mark.wash > 0 {
            let hug = Pen.hug(mark.box, tokens: tokens, avoiding: texts)
            ctx.addPath(CGPath(roundedRect: CGRect(x: hug.x, y: hug.y, width: hug.w, height: hug.h), cornerWidth: min(Pen.corner, hug.h / 2), cornerHeight: min(Pen.corner, hug.h / 2), transform: nil))
            ctx.setFillColor(cardinal.copy(alpha: tokens.mark.wash * mark.drawn) ?? cardinal)
            ctx.fillPath()
        }
        ctx.setStrokeColor(boxed ? cardinal : ember)
        ctx.setLineWidth(boxed ? tokens.mark.boxWidth : tokens.mark.width)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        ctx.addLines(between: Pen.reach(points, mark.drawn).inked)
        ctx.strokePath()
        if let label = mark.label, mark.drawn >= 1 {
            let text = inked(label, size: tokens.mark.labelType, color: cardinal, weight: .semibold, hand: true)
            let size = text.size()
            let w = Double(size.width), h = Double(size.height)
            let leftEdge = Double(points.map(\.x).min() ?? CGFloat(mark.box.x))
            let middle = mark.box.y + mark.box.h / 2 - h / 2
            let spots = [
                Box(x: leftEdge - w - 10, y: middle, w: w, h: h),
                Box(x: mark.box.x + mark.box.w + 14, y: middle, w: w, h: h),
                Box(x: mark.box.x, y: mark.box.y - h - 10, w: w, h: h),
                Box(x: mark.box.x, y: mark.box.y + mark.box.h + 10, w: w, h: h),
            ]
            let free = spots.first { spot in
                spot.x > 8 && spot.y > 8 && spot.x + spot.w < width - 8 && spot.y + spot.h < height - 8
                    && !texts.contains { $0.x < spot.x + spot.w && spot.x < $0.x + $0.w && $0.y < spot.y + spot.h && spot.y < $0.y + $0.h }
            }
            if let free { text.draw(at: CGPoint(x: free.x, y: free.y)) }
        }
        let xs = points.map(\.x), ys = points.map(\.y)
        let bounds = Box(x: xs.min() ?? 0, y: ys.min() ?? 0, w: max((xs.max() ?? 0) - (xs.min() ?? 0), 1), h: max((ys.max() ?? 0) - (ys.min() ?? 0), 1))
        return bounds
    }

    func trail(_ points: [TrailPoint], _ ctx: CGContext) -> Box? {
        guard points.count > 1 else { return nil }
        ctx.setLineWidth(tokens.mark.width + 1)
        ctx.setLineCap(.round)
        for i in 1..<points.count {
            ctx.setStrokeColor(accent.copy(alpha: points[i].alpha * 0.9) ?? accent)
            ctx.move(to: CGPoint(x: points[i - 1].x, y: points[i - 1].y))
            ctx.addLine(to: CGPoint(x: points[i].x, y: points[i].y))
            ctx.strokePath()
        }
        let xs = points.map(\.x), ys = points.map(\.y)
        return Box(x: xs.min()!, y: ys.min()!, w: max(xs.max()! - xs.min()!, 1), h: max(ys.max()! - ys.min()!, 1))
    }
}
