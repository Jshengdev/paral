import AppKit

/// Where the parts of the way arrow are, once room has been found for it: the two together, the tag, the arrow's own
/// room, and the place beside it where the cursor rests.
struct WayPlace {
    var whole: Box
    var pill: CGRect
    var arrow: Box
    var rest: CGPoint
    var name: NSAttributedString
}

extension Painter {
    /// Finds room for the way arrow: the tag with the name of what it leads to, the arrow beside it, and beside that
    /// a place for the cursor, at the edge he must scroll toward and clear of `taken` (`Layout.way`).
    func place(_ way: WayPicture, avoiding taken: [Box]) -> WayPlace {
        let w = tokens.way, c = tokens.cursor
        let name = named(way.toward, within: w.maxWidth - 2 * w.padX)
        let words = name.size()
        let tag = CGSize(width: words.width + 2 * w.padX, height: words.height + 2 * w.padY)
        let cursorRoom = c.gap + Layout.cursorWide * c.size + c.edge
        let whole = Layout.way(down: way.down, size: (tag.width + w.gap + w.wide + cursorRoom, max(tag.height, w.tall, c.size)), taken: taken, width: width, height: height, tokens: tokens)
        // The tag sits at the arrow's tail, the end away from the edge it points to.
        let pill = CGRect(x: whole.x, y: way.down ? whole.y : whole.y + whole.h - tag.height, width: tag.width, height: tag.height)
        let arrow = Box(x: whole.x + tag.width + w.gap, y: whole.y, w: w.wide, h: whole.h)
        return WayPlace(whole: whole, pill: pill, arrow: arrow, rest: CGPoint(x: arrow.x + arrow.w + c.gap, y: pill.minY), name: name)
    }

    /// The pen's strokes for the arrow as it stands, dipped toward its edge while it nods.
    private func strokes(_ way: WayPicture, _ place: WayPlace) -> [[CGPoint]] {
        let room = place.arrow.moved(dx: 0, dy: way.down ? way.nod : -way.nod)
        return Pen.arrow(in: room, inset: place.pill.height / 2, down: way.down, tokens: tokens)
    }

    /// The arrow that says which way to scroll, and a tag beside it that names what it leads to. The tag is the
    /// capsule's own light surface, so it reads as paral's on any page. The arrow is inked by the pen as far as it has got, with
    /// a paper edge under it so it shows on a dark page too, and it dips toward its edge while it nods.
    func way(_ way: WayPicture, at place: WayPlace, _ ctx: CGContext) {
        let w = tokens.way
        let shape = CGPath(roundedRect: place.pill, cornerWidth: place.pill.height / 2, cornerHeight: place.pill.height / 2, transform: nil)
        ctx.saveGState()
        ctx.setShadow(offset: .zero, blur: tokens.shadow, color: CGColor(gray: 0, alpha: 0.28))
        ctx.addPath(shape)
        ctx.setFillColor(light.copy(alpha: tokens.glass) ?? light)
        ctx.fillPath()
        ctx.restoreGState()
        place.name.draw(at: CGPoint(x: place.pill.minX + w.padX, y: place.pill.minY + w.padY))

        let inked = Pen.reach(strokes: strokes(way, place), way.drawn)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        // The paper edge goes down first, under all of the ink.
        let edge = w.halo > 0 ? [(paper, tokens.mark.width + 2 * w.halo)] : []
        for (colour, wide) in edge + [(ember, tokens.mark.width)] {
            ctx.setStrokeColor(colour)
            ctx.setLineWidth(wide)
            for stroke in inked where stroke.count > 1 { ctx.addLines(between: stroke) }
            ctx.strokePath()
        }
    }

    /// Where the cursor's tip is while it is with the arrow: on its flight to the arrow's tail, then on the pen's tip
    /// as the arrow is inked, then stepping aside to rest beside it.
    func tip(of pointer: PointerPicture, with way: WayPicture, at place: WayPlace) -> CGPoint {
        guard let with = pointer.withWay else { return CGPoint(x: pointer.x, y: pointer.y) }
        let all = strokes(way, place)
        let tail = all.first?.first ?? place.rest
        if with.flight < 1 {
            return Motion.arc(from: CGPoint(x: pointer.x, y: pointer.y), to: tail, Motion.spring(with.flight, bounce: tokens.motion.bounce), lift: tokens.motion.arc)
        }
        let pen = Pen.reach(strokes: all, way.drawn).last?.last ?? tail
        guard way.drawn >= 1 else { return pen }
        return CGPoint(x: pen.x + (place.rest.x - pen.x) * with.aside, y: pen.y + (place.rest.y - pen.y) * with.aside)
    }

    /// The name as the tag writes it: whole when it fits, and otherwise cut short with a mark that says so.
    private func named(_ text: String, within room: Double) -> NSAttributedString {
        let whole = inked(text, size: tokens.way.type, color: ink, weight: .medium)
        guard whole.size().width > room else { return whole }
        var kept = Substring(text)
        while kept.count > 1 {
            kept = kept.dropLast()
            let cut = inked(kept.trimmingCharacters(in: .whitespaces) + "…", size: tokens.way.type, color: ink, weight: .medium)
            if cut.size().width <= room { return cut }
        }
        return whole
    }
}
