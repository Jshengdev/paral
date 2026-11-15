import AppKit

/// The last place found for the nudge card and what it was found for. The search for a free place tries thousands of
/// boxes, and nothing it depends on moves while the card is up, so it is kept while it stays free.
final class NudgePlaces {
    struct Asked: Equatable { var text: String; var w, h: Double; var beside: Box?; var texts: [Box] }
    var asked: Asked?
    var found: (box: Box, scale: Double)?
    /// What it kept off when it was found, so a search that found no place is made again only when that moves.
    var taken: [Box] = []
}

extension Painter {
    /// A pill button of the card: its words, and its size with the room round them.
    private func pill(_ text: String, primary: Bool) -> (label: NSAttributedString, size: CGSize) {
        let n = tokens.nudge
        let label = NSMutableAttributedString(attributedString: inked(text, size: n.buttonType, color: primary ? paper : ink, weight: .medium))
        label.addAttribute(.kern, value: n.tracking, range: NSRange(location: 0, length: label.length))
        let size = label.size()
        return (label, CGSize(width: (size.width + 2 * n.buttonPadX).rounded(.up), height: (size.height + 2 * n.buttonPadY).rounded(.up)))
    }

    /// Where the cursor rests beside the card's own mark, and the whole ink of every mark: the card keeps off both,
    /// at their full size from the first moment, so it does not move as the pen draws. The resting place is found as
    /// the scene finds it (`ScenePointer.swift`), beside the mark and the tags on its line.
    private func held(_ marks: [MarkPicture], of id: String, tags: [TagPicture], cursor: Bool, avoiding texts: [Box]) -> [Box] {
        let c = tokens.cursor
        var held: [Box] = []
        for mark in marks {
            var whole = mark
            whole.drawn = 1
            guard let path = Painter.bounds(of: Pen.path(of: whole, tokens: tokens, avoiding: texts, inside: (width, height))) else { continue }
            held.append(path.grown(tokens.mark.width / 2))
            guard cursor, mark.key.hasPrefix(id + "/") else { continue }
            let near = Layout.resting(ink: path, kind: mark.kind, line: mark.box, tags: tags.filter { Scene.sameLine($0.line, mark.box) }.compactMap { tag in tag.box.map { Layout.tagLargest($0, of: tag.line, tokens: tokens) } })
            let tip = Layout.beside(near, cursor: c.size, gap: c.gap, texts: texts, width: width, height: height)
            held.append(Layout.cursor(tip: tip, size: c.size))
        }
        return held
    }

    /// The nudge card, after the design kit's: the light surface; at the top the avatar (the guide's card's own small
    /// picture) and the name in stone, with the steps paral took under the name, small, in stone and joined as the
    /// capsule joins them; then the message in ink at the body size, wrapped, its words in stone until they are said
    /// when it has a voice; and, when its date can be kept, "Add to calendar" in ink and "Not now" in mist. It sits
    /// beside the line it is about, clear of the page's words, the marks, the resting cursor and `taken`
    /// (`Layout.nudge`). It comes up from a little low and a little small, anchored at its top, and its rows after it,
    /// each rising; it goes faster, fading and shrinking a little. A held button is drawn smaller. Gives back the card's
    /// place, and each button's while the card can be pressed; or nothing, drawing nothing, when no place is free
    /// even at its smallest, and then the line is shown in the capsule (`Painter.paint`).
    func nudge(_ card: NudgePicture, avoiding texts: [Box], taken: [Box], marks: [MarkPicture], tags: [TagPicture] = [], cursor: Bool, _ ctx: CGContext) -> [Drawn] {
        let n = tokens.nudge, stone = color(tokens.stone)
        let wrapped: NSString.DrawingOptions = [.usesLineFragmentOrigin, .usesFontLeading]
        let inner = n.width - 2 * n.pad, beyond = n.avatar + n.nameGap
        let name = inked(tokens.strings.name, size: n.nameType, color: stone, weight: .medium)
        let trail = NSMutableAttributedString()
        for (index, step) in card.trail.enumerated() {
            if index > 0 { trail.append(inked("  ›  ", size: n.trailType, color: stone, weight: .medium)) }
            trail.append(inked(step.text, size: n.trailType, color: stone.copy(alpha: step.bright) ?? stone, weight: .medium))
        }
        let message = NSMutableAttributedString()
        for (index, word) in card.words.enumerated() {
            message.append(inked((index > 0 ? " " : "") + word.text, size: n.type, color: word.bright >= 1 ? ink : stone))
        }
        let trailSize = trail.boundingRect(with: CGSize(width: inner - beyond, height: .greatestFiniteMagnitude), options: wrapped).size
        let said = message.boundingRect(with: CGSize(width: inner, height: .greatestFiniteMagnitude), options: wrapped).size
        let head = max(n.avatar, name.size().height)
        let trailTall = card.trail.isEmpty ? 0 : n.trailGap + trailSize.height.rounded(.up)
        let pills = card.offer.map { [(NudgeButton.add, pill($0.label, primary: true)), (NudgeButton.notNow, pill(n.notNow, primary: false))] } ?? []
        let pillTall = pills.map(\.1.size.height).max() ?? 0
        let full = CGSize(width: n.width, height: n.pad + head + trailTall + n.gap + said.height.rounded(.up) + (pills.isEmpty ? 0 : n.gap + pillTall) + n.pad)

        let asked = NudgePlaces.Asked(text: card.text, w: full.width, h: full.height, beside: card.beside, texts: texts)
        let was = nudges.asked == asked ? nudges.found : nil, kept = taken + held(marks, of: card.id, tags: tags, cursor: cursor, avoiding: texts)
        // A card that is going stays where it was, whatever has come up since.
        let place: (box: Box, scale: Double)?
        if card.coming.gone > 0, let was { place = was } else if nudges.asked == asked, was == nil, nudges.taken == kept { place = nil } else {
            place = Layout.nudge(size: (full.width, full.height), beside: card.beside, texts: texts, taken: kept, was: was, width: width, height: floor, tokens: tokens)
        }
        (nudges.asked, nudges.found, nudges.taken) = (asked, place, kept)
        guard let place else { return [] }

        // At its place and at the size it was fitted to; there it comes up and goes as any card does, its three
        // lines after it (`PainterCard.swift`).
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.translateBy(x: place.box.x, y: place.box.y)
        ctx.scaleBy(x: place.scale, y: place.scale)
        let whole = CGRect(origin: .zero, size: full)
        let named = CGRect(x: n.pad, y: n.pad, width: inner, height: head + trailTall)
        let worded = CGRect(x: n.pad, y: named.maxY + n.gap, width: inner, height: said.height.rounded(.up))
        let row = CGRect(x: n.pad, y: worded.maxY + n.gap, width: inner, height: pillTall)
        let at = pills.indices.map { index in n.pad + pills[..<index].reduce(0) { $0 + $1.1.size.width + n.buttonGap } }
        self.card(whole, radius: n.radius, card.coming, ctx) {
            _ = line(0, of: card.coming, on: whole, at: named, ctx) {
                logo(middle: CGPoint(x: named.minX + n.avatar / 2, y: named.minY + head / 2), across: n.avatar, ctx)
                name.draw(at: CGPoint(x: named.minX + beyond, y: named.minY + (head - name.size().height) / 2))
                if !card.trail.isEmpty { trail.draw(with: CGRect(x: named.minX + beyond, y: named.minY + head + n.trailGap, width: inner - beyond, height: trailSize.height.rounded(.up)), options: wrapped) }
            }
            _ = line(1, of: card.coming, on: whole, at: worded, ctx) { message.draw(with: worded, options: wrapped) }
            _ = line(2, of: card.coming, on: whole, at: row, ctx) {
                for ((button, pill), x) in zip(pills, at) {
                    ctx.saveGState()
                    // A held button, or the one he pressed while the card waits for what it asked, is drawn smaller.
                    let shrink = card.held == button || card.answered == button ? n.pressed : 1
                    ctx.translateBy(x: x + pill.size.width / 2, y: row.minY + pill.size.height / 2)
                    ctx.scaleBy(x: shrink, y: shrink)
                    let shape = CGRect(x: -pill.size.width / 2, y: -pill.size.height / 2, width: pill.size.width, height: pill.size.height)
                    ctx.addPath(CGPath(roundedRect: shape, cornerWidth: shape.height / 2, cornerHeight: shape.height / 2, transform: nil))
                    ctx.setFillColor(button == .add ? ink : mist)
                    ctx.fillPath()
                    pill.label.draw(at: CGPoint(x: shape.minX + n.buttonPadX, y: -pill.label.size().height / 2))
                    ctx.restoreGState()
                }
            }
        }
        var drawn = [Drawn(what: "nudge", id: card.id, box: place.box)]
        // Where a click on each button is taken: its place on the card at rest, offered only while the card can be pressed.
        guard card.coming.gone == 0, card.answered == nil else { return drawn }
        let s = place.scale
        for ((button, pill), x) in zip(pills, at) {
            drawn.append(Drawn(what: "button", id: button.rawValue, box: Box(x: place.box.x + s * x, y: place.box.y + s * row.minY, w: s * pill.size.width, h: s * pill.size.height)))
        }
        return drawn
    }
}
