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
    /// overlay cannot see the page under it. It comes up as a card does; its badge pops out from `toast.badgeFrom`
    /// of its size, and the tick is drawn by a pen. Gives back its place, the badge's box just then, and the points
    /// of the tick that are inked.
    func toast(_ toast: ToastPicture, avoiding taken: [Box], _ ctx: CGContext) -> (place: Box, badge: Box, tick: [CGPoint]) {
        let t = tokens.toast, c = tokens.capsule
        let words = inked(toast.text, size: t.type, color: ink, weight: .medium)
        let size = words.size()
        let round = Painter.badge * t.type
        let tall = max(round, size.height) + 2 * t.pad
        let wide = t.pad + round + t.gap + size.width + 2 * t.pad
        // Raised from the edge so that its middle is level with the capsule's.
        let rise = c.bottom + c.height / 2 - tokens.way.edge - tall / 2
        let place = Layout.way(down: true, size: (wide, tall), rise: rise, taken: taken, width: width, height: floor, tokens: tokens)
        let pill = CGRect(x: place.x, y: place.y, width: place.w, height: place.h)
        // The badge at the size it has just then, about its own middle; the tick in it as far as the pen has got.
        let across = round * (t.badgeFrom + (1 - t.badgeFrom) * toast.badge)
        let spot = CGRect(x: pill.minX + t.pad + (round - across) / 2, y: pill.midY - across / 2, width: across, height: across)
        let inked = Pen.reach(Painter.tick.map { CGPoint(x: spot.minX + $0.x * across, y: spot.minY + $0.y * across) }, toast.tick).inked
        card(pill, radius: tall / 2, toast.coming, ctx) {
            ctx.setFillColor(cardinal)
            ctx.fillEllipse(in: spot)
            if toast.tick > 0 {
                ctx.setStrokeColor(paper)
                ctx.setLineWidth(Painter.tickLine * across)
                ctx.setLineCap(.round)
                ctx.setLineJoin(.round)
                ctx.addLines(between: inked)
                ctx.strokePath()
            }
            words.draw(at: CGPoint(x: pill.minX + t.pad + round + t.gap, y: pill.midY - size.height / 2))
        }
        return (place, Box(x: spot.minX, y: spot.minY, w: across, h: across), toast.tick > 0 ? inked : [])
    }
}
