import AppKit

/// Draws a card as it comes up and goes, after the design kit's cards: the card from a little smaller and a little
/// low, then its lines one after another, each rising into place. Any card may be drawn with these two; the guide's
/// card is.
extension Painter {
    /// How large a card is drawn just then, and how far below its place.
    private func stands(_ coming: CardArrival) -> (size: Double, low: Double, strength: Double) {
        let c = tokens.card
        return ((c.from + (1 - c.from) * coming.card) * (1 - (1 - c.goneTo) * coming.gone), c.drop * (1 - coming.card), min(max(coming.card, 0), 1) * (1 - coming.gone))
    }

    /// Draws the light surface of a card whose place is `place`, as far as it has come up or gone, and then
    /// `contents` on it. It grows from the middle of its top edge.
    func card(_ place: CGRect, radius: Double, _ coming: CardArrival, _ ctx: CGContext, contents: () -> Void) {
        let now = stands(coming)
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(now.strength)
        ctx.translateBy(x: place.midX, y: place.minY + now.low)
        ctx.scaleBy(x: now.size, y: now.size)
        ctx.translateBy(x: -place.midX, y: -place.minY)
        surface(CGPath(roundedRect: place, cornerWidth: radius, cornerHeight: radius, transform: nil), ctx)
        contents()
    }

    /// Draws one line of a card, as far as that line has come up: it rises `card.rise` into place. Called from a
    /// card's `contents`. `at` is where the line is when the card is whole; gives back where it is on the display
    /// just then, or nothing while it has not begun to come.
    func line(_ index: Int, of coming: CardArrival, on place: CGRect, at whole: CGRect, _ ctx: CGContext, _ draw: () -> Void) -> Box? {
        let share = coming.lines.indices.contains(index) ? coming.lines[index] : 1
        guard share > 0 else { return nil }
        let now = stands(coming), low = tokens.card.rise * (1 - share)
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(now.strength * min(share, 1))
        ctx.translateBy(x: 0, y: low)
        draw()
        // The card's own growing and lowering move the line with it.
        func onDisplay(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: place.midX + (x - place.midX) * now.size, y: place.minY + now.low + (y + low - place.minY) * now.size) }
        let corner = onDisplay(whole.minX, whole.minY), far = onDisplay(whole.maxX, whole.maxY)
        return Box(x: corner.x, y: corner.y, w: far.x - corner.x, h: far.y - corner.y)
    }
}
