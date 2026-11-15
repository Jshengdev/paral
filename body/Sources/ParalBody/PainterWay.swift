import AppKit

extension Painter {
    /// The arrow that says which way to scroll, and a tag beside it that names what it leads to. The tag is in the
    /// capsule's own ink, so it reads as paral's on any page. The arrow is inked by the pen as far as it has got, with
    /// a paper edge under it so it shows on a dark page too, and it dips toward its edge while it nods. It goes where
    /// `Layout.way` finds room clear of `taken`. Gives back the box of the two at rest.
    func way(_ way: WayPicture, avoiding taken: [Box], _ ctx: CGContext) -> Box {
        let w = tokens.way
        let name = named(way.toward, within: w.maxWidth - 2 * w.padX)
        let words = name.size()
        let tag = CGSize(width: words.width + 2 * w.padX, height: words.height + 2 * w.padY)
        let place = Layout.way(down: way.down, size: (tag.width + w.gap + w.wide, max(tag.height, w.tall)), taken: taken, width: width, height: height, tokens: tokens)

        // The tag sits at the arrow's tail, the end away from the edge it points to.
        let pill = CGRect(x: place.x, y: way.down ? place.y : place.y + place.h - tag.height, width: tag.width, height: tag.height)
        let shape = CGPath(roundedRect: pill, cornerWidth: pill.height / 2, cornerHeight: pill.height / 2, transform: nil)
        ctx.addPath(shape)
        ctx.setFillColor(ink)
        ctx.fillPath()
        ctx.addPath(shape)
        ctx.setStrokeColor(paper.copy(alpha: 0.85) ?? paper)
        ctx.setLineWidth(1)
        ctx.strokePath()
        name.draw(at: CGPoint(x: pill.minX + w.padX, y: pill.minY + w.padY))

        let dip = way.down ? way.nod : -way.nod
        let room = Box(x: place.x + tag.width + w.gap, y: place.y + dip, w: w.wide, h: place.h)
        let strokes = Pen.reach(strokes: Pen.arrow(in: room, inset: tag.height / 2, down: way.down, tokens: tokens), way.drawn)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        // The paper edge goes down first, under all of the ink.
        let edge = w.halo > 0 ? [(paper, tokens.mark.width + 2 * w.halo)] : []
        for (colour, wide) in edge + [(ember, tokens.mark.width)] {
            ctx.setStrokeColor(colour)
            ctx.setLineWidth(wide)
            for stroke in strokes where stroke.count > 1 { ctx.addLines(between: stroke) }
            ctx.strokePath()
        }
        return place
    }

    /// The name as the tag writes it: whole when it fits, and otherwise cut short with a mark that says so.
    private func named(_ text: String, within room: Double) -> NSAttributedString {
        let whole = inked(text, size: tokens.way.type, color: paper, weight: .medium)
        guard whole.size().width > room else { return whole }
        var kept = Substring(text)
        while kept.count > 1 {
            kept = kept.dropLast()
            let cut = inked(kept.trimmingCharacters(in: .whitespaces) + "…", size: tokens.way.type, color: paper, weight: .medium)
            if cut.size().width <= room { return cut }
        }
        return whole
    }
}
