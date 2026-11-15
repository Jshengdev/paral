import AppKit

extension Painter {
    /// The guide's card, after the design kit's nudge without its buttons: the light surface, the orb and the name
    /// small at the top with the step's number beside them, then what to do next at the body size, wrapped to the
    /// card's width. It sits in a corner clear of `taken` (`Layout.corner`). Gives back its box.
    func guide(_ guide: GuidePicture, avoiding taken: [Box], _ ctx: CGContext) -> Box {
        let g = tokens.guide
        let wrapped: NSString.DrawingOptions = [.usesLineFragmentOrigin, .usesFontLeading]
        let quiet = ink.copy(alpha: tokens.dim) ?? ink
        let name = inked(tokens.strings.name, size: g.small, color: quiet, weight: .medium)
        let step = guide.n.flatMap { n in guide.of.map { of in inked(tokens.strings.step.replacingOccurrences(of: "{n}", with: "\(n)").replacingOccurrences(of: "{of}", with: "\(of)"), size: g.small, color: quiet, weight: .medium) } }
        let words = inked(guide.text, size: g.type, color: ink)
        let inner = g.width - 2 * g.pad
        let said = words.boundingRect(with: CGSize(width: inner, height: .greatestFiniteMagnitude), options: wrapped).size
        let head = max(name.size().height, g.orb)
        let place = Layout.corner(size: (g.width, g.pad + head + g.gap + said.height.rounded(.up) + g.pad), taken: taken, width: width, height: height, tokens: tokens)
        let card = CGRect(x: place.x, y: place.y, width: place.w, height: place.h)

        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(guide.appear)
        surface(CGPath(roundedRect: card, cornerWidth: g.radius, cornerHeight: g.radius, transform: nil), ctx)
        let top = card.minY + g.pad
        orb(middle: CGPoint(x: card.minX + g.pad + g.orb / 2, y: top + head / 2), across: g.orb, clock: 0, ctx)
        name.draw(at: CGPoint(x: card.minX + g.pad + g.orb + 8, y: top + (head - name.size().height) / 2))
        if let step { step.draw(at: CGPoint(x: card.maxX - g.pad - step.size().width, y: top + (head - step.size().height) / 2)) }
        words.draw(with: CGRect(x: card.minX + g.pad, y: top + head + g.gap, width: inner, height: said.height.rounded(.up)), options: wrapped)
        return place
    }
}
