import AppKit

extension Painter {
    /// From the design kit's toast, as shares of its type size: the round badge is 30 across for type of 18, the tick
    /// in it is drawn 2.2 thick through three points, and the room to the right of the words is twice the room on
    /// the left of the badge.
    private static let badge = 30.0 / 18, tickLine = 2.2 / 30
    private static let tick: [(x: Double, y: Double)] = [(9.5 / 30, 15.0 / 30), (13.5 / 30, 19.0 / 30), (20.5 / 30, 11.0 / 30)]

    /// The toast that confirms something paral did, after the design kit's: a light pill with a soft shadow, a
    /// cardinal badge with a tick in it, and the words in the look's ink. It sits at the bottom edge beside the
    /// capsule, level with it, on none of `taken` (`Layout.way`). It is not blurred behind, as the kit's is: the
    /// overlay cannot see the page under it. Gives back its box.
    func toast(_ toast: ToastPicture, avoiding taken: [Box], _ ctx: CGContext) -> Box {
        let t = tokens.toast, c = tokens.capsule
        let words = inked(toast.text, size: t.type, color: ink, weight: .medium)
        let size = words.size()
        let round = Painter.badge * t.type
        let tall = max(round, size.height) + 2 * t.pad
        let wide = t.pad + round + t.gap + size.width + 2 * t.pad
        // Raised from the edge so that its middle is level with the capsule's.
        let rise = c.bottom + c.height / 2 - tokens.way.edge - tall / 2
        let place = Layout.way(down: true, size: (wide, tall), rise: rise, taken: taken, width: width, height: height, tokens: tokens)
        let pill = CGRect(x: place.x, y: place.y, width: place.w, height: place.h)
        let shape = CGPath(roundedRect: pill, cornerWidth: tall / 2, cornerHeight: tall / 2, transform: nil)

        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(toast.appear)
        surface(shape, ctx)

        let spot = CGRect(x: pill.minX + t.pad, y: pill.midY - round / 2, width: round, height: round)
        ctx.setFillColor(cardinal)
        ctx.fillEllipse(in: spot)
        ctx.setStrokeColor(paper)
        ctx.setLineWidth(Painter.tickLine * round)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        ctx.addLines(between: Painter.tick.map { CGPoint(x: spot.minX + $0.x * round, y: spot.minY + $0.y * round) })
        ctx.strokePath()
        words.draw(at: CGPoint(x: spot.maxX + t.gap, y: pill.midY - size.height / 2))
        return place
    }
}
