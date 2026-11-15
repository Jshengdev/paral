import AppKit

extension Painter {
    /// Draws every tag where the scene placed it (`SceneTag.swift`). Gives back each as `chip`, with its key and its
    /// box just then; and a tag that found no free place by its line as `chip-unplaced`, with its line's box, so a
    /// film's record says it was not drawn rather than leaving it out in silence.
    func tags(_ tags: [TagPicture], _ ctx: CGContext) -> [Drawn] {
        tags.compactMap { tag in
            guard let box = tag.box else { return Drawn(what: "chip-unplaced", id: tag.key, box: tag.line) }
            guard tag.grown > 0 else { return nil }
            return Drawn(what: "chip", id: tag.key, box: self.tag(tag, at: box, ctx))
        }
    }

    /// One tag, after the design kit's chips: a capsule of a few words in DM Sans Medium at the cursor's tag's size.
    /// `strong` is ink with white words ("Next"), `quiet` mist with stone words ("Done"), and `date` white with a
    /// cardinal edge and cardinal words ("7 days left"). They are flat, with no shadow: they sit on the page's own
    /// white beside its words, as the kit's do. It pops out from the corner nearest its line's end, from `chip.from`
    /// of its size and a little past it, fading in as it comes. Gives back its box just then.
    private func tag(_ tag: TagPicture, at box: Box, _ ctx: CGContext) -> Box {
        let c = tokens.chip
        let fill: CGColor, edge: CGColor?, words: CGColor
        switch tag.tone {
        case .strong: (fill, edge, words) = (ink, nil, paper)
        case .quiet: (fill, edge, words) = (mist, nil, color(tokens.stone))
        case .date: (fill, edge, words) = (light, cardinal, cardinal)
        }
        let (now, scale, anchor) = Layout.tag(box, of: tag.line, grown: tag.grown, tokens: tokens)
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.translateBy(x: anchor.x, y: anchor.y)
        ctx.scaleBy(x: scale, y: scale)
        ctx.translateBy(x: -anchor.x, y: -anchor.y)
        ctx.setAlpha(min(max(tag.grown, 0), 1))
        let pill = CGRect(x: box.x, y: box.y, width: box.w, height: box.h)
        ctx.addPath(CGPath(roundedRect: pill, cornerWidth: box.h / 2, cornerHeight: box.h / 2, transform: nil))
        ctx.setFillColor(fill)
        ctx.fillPath()
        if let edge {
            let inside = pill.insetBy(dx: c.edge / 2, dy: c.edge / 2)
            ctx.addPath(CGPath(roundedRect: inside, cornerWidth: inside.height / 2, cornerHeight: inside.height / 2, transform: nil))
            ctx.setStrokeColor(edge)
            ctx.setLineWidth(c.edge)
            ctx.strokePath()
        }
        let text = inked(tag.words, size: c.type, color: words, weight: .medium), size = text.size()
        text.draw(at: CGPoint(x: box.x + (box.w - size.width) / 2, y: box.y + box.h / 2 - size.height / 2))
        return now
    }
}
