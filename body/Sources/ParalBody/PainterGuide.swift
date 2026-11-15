import AppKit

extension Painter {
    /// The guide's card, after the design kit's nudge without its buttons: the light surface, the logo and the name
    /// small at the top with the step's number beside them, then what to do next at the body size, wrapped to the
    /// card's width. It sits in a corner clear of `taken` (`Layout.corner`). It comes up as any card does
    /// (`PainterCard.swift`): the card, then the name line, then the words. Gives back its place, and where each of
    /// its lines is just then.
    func guide(_ guide: GuidePicture, avoiding taken: [Box], _ ctx: CGContext) -> (card: Box, lines: [Box]) {
        let g = tokens.guide
        let wrapped: NSString.DrawingOptions = [.usesLineFragmentOrigin, .usesFontLeading]
        let quiet = color(tokens.stone)
        let name = inked(tokens.strings.name, size: g.small, color: quiet, weight: .medium)
        let step = guide.n.flatMap { n in guide.of.map { of in inked(tokens.strings.step.replacingOccurrences(of: "{n}", with: "\(n)").replacingOccurrences(of: "{of}", with: "\(of)"), size: g.small, color: quiet, weight: .medium) } }
        let words = inked(guide.text, size: g.type, color: ink)
        let inner = g.width - 2 * g.pad
        let said = words.boundingRect(with: CGSize(width: inner, height: .greatestFiniteMagnitude), options: wrapped).size
        let head = max(name.size().height, g.avatar)
        let place = Layout.corner(size: (g.width, g.pad + head + g.gap + said.height.rounded(.up) + g.pad), taken: taken, width: width, height: floor, tokens: tokens)
        let card = CGRect(x: place.x, y: place.y, width: place.w, height: place.h)

        let top = card.minY + g.pad
        let named = CGRect(x: card.minX + g.pad, y: top, width: inner, height: head)
        let worded = CGRect(x: card.minX + g.pad, y: top + head + g.gap, width: inner, height: said.height.rounded(.up))
        var lines: [Box?] = []
        self.card(card, radius: g.radius, guide.coming, ctx) {
            lines.append(line(0, of: guide.coming, on: card, at: named, ctx) {
                logo(middle: CGPoint(x: named.minX + g.avatar / 2, y: named.midY), across: g.avatar, ctx)
                name.draw(at: CGPoint(x: named.minX + g.avatar + g.nameGap, y: named.midY - name.size().height / 2))
                if let step { step.draw(at: CGPoint(x: named.maxX - step.size().width, y: named.midY - step.size().height / 2)) }
            })
            lines.append(line(1, of: guide.coming, on: card, at: worded, ctx) { words.draw(with: worded, options: wrapped) })
        }
        return (place, lines.compactMap { $0 })
    }
}
