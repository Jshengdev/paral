import AppKit

extension Painter {
    /// Inks a mark as far as it has been drawn, and writes its label once the ink is whole. Gives back the mark's
    /// box, or nothing while no ink is down yet.
    /// `his` is for his own loop coming back: whatever its shape it is drawn by hand in ember with no wash, since
    /// the wash is the kit's highlight for one line and he may have circled a whole table.
    func mark(_ mark: MarkPicture, his: Bool = false, avoiding texts: [Box], _ ctx: CGContext) -> (box: Box, inked: [CGPoint])? {
        guard mark.drawn > 0 else { return nil }
        let points = Pen.path(of: mark, tokens: tokens, avoiding: texts, inside: (width, height))
        // The design kit's two ways to show a place. A ring or a line is drawn by hand, in ember. A box is the kit's
        // neat highlight: a thinner cardinal edge, and a faint wash of cardinal laid across the line from its start
        // as the edge is drawn, the way a highlighter is pulled along. (A wash that came up all at once as it grew
        // stronger read as popped in: every pixel of it crosses any line a reader draws at the same moment.)
        let boxed = mark.kind == .box && !his
        if boxed, tokens.mark.wash > 0 {
            let hug = Pen.hug(mark.box, tokens: tokens, avoiding: texts)
            ctx.saveGState()
            ctx.clip(to: CGRect(x: hug.x, y: hug.y, width: hug.w * mark.drawn, height: hug.h))
            ctx.addPath(CGPath(roundedRect: CGRect(x: hug.x, y: hug.y, width: hug.w, height: hug.h), cornerWidth: min(tokens.mark.boxRadius, hug.h / 2), cornerHeight: min(tokens.mark.boxRadius, hug.h / 2), transform: nil))
            // While it breathes, the wash deepens with the glow and comes back.
            ctx.setFillColor(cardinal.copy(alpha: tokens.mark.wash + max(tokens.mark.breathDeep - tokens.mark.wash, 0) * mark.breath) ?? cardinal)
            ctx.fillPath()
            ctx.restoreGState()
        }
        let colour = boxed ? cardinal : ember, wide = boxed ? tokens.mark.boxWidth : tokens.mark.width
        let line = Pen.reach(points, mark.drawn).inked
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        // A breath is a glow of the mark's own colour round its ink, which swells and goes back. It moves nothing
        // and hides nothing: the words under it still read.
        if mark.breath > 0 {
            ctx.setStrokeColor(colour.copy(alpha: tokens.mark.breathDeep * mark.breath) ?? colour)
            ctx.setLineWidth(wide + 2 * tokens.mark.breath * mark.breath)
            ctx.addLines(between: line)
            ctx.strokePath()
        }
        ctx.setStrokeColor(colour)
        ctx.setLineWidth(wide)
        ctx.addLines(between: line)
        ctx.strokePath()
        if let label = mark.label, mark.drawn >= 1 {
            let text = inked(label, size: tokens.mark.labelType, color: cardinal, weight: .medium)
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
        return (bounds, line)
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
