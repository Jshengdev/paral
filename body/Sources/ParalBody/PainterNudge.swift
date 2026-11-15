import AppKit

/// The last place found for the nudge card and what it was found for. The search for a free place tries thousands of
/// boxes, and nothing it depends on moves while the card is up, so it is kept while it stays free.
final class NudgePlaces {
    struct Asked: Equatable { var text: String; var w, h: Double; var beside: Box?; var texts: [Box] }
    var asked: Asked?
    var found: (box: Box, scale: Double)?
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
    /// at their full size from the first moment, so it does not move as the pen draws.
    private func held(_ marks: [MarkPicture], of id: String, cursor: Bool, avoiding texts: [Box]) -> [Box] {
        let c = tokens.cursor
        func box(_ path: [CGPoint]) -> Box {
            let xs = path.map(\.x), ys = path.map(\.y), half = tokens.mark.width / 2
            return Box(x: (xs.min() ?? 0) - half, y: (ys.min() ?? 0) - half, w: (xs.max() ?? 0) - (xs.min() ?? 0) + 2 * half, h: (ys.max() ?? 0) - (ys.min() ?? 0) + 2 * half)
        }
        var held: [Box] = []
        for mark in marks {
            var whole = mark
            whole.drawn = 1
            let ink = box(Pen.path(of: whole, tokens: tokens, avoiding: texts, inside: (width, height)))
            held.append(ink)
            guard cursor, mark.key.hasPrefix(id + "/") else { continue }
            let tip = Layout.beside(ink, cursor: (c.size * Layout.cursorWide, c.size), edge: c.edge, gap: c.gap, texts: texts, width: width, height: height)
            held.append(Box(x: tip.x - c.edge, y: tip.y - c.edge, w: Layout.cursorWide * c.size + 2 * c.edge, h: c.size + 2 * c.edge))
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
    /// place, and each button's while the card can be pressed.
    func nudge(_ card: NudgePicture, avoiding texts: [Box], taken: [Box], marks: [MarkPicture], cursor: Bool, _ ctx: CGContext) -> [Drawn] {
        let n = tokens.nudge, stone = color(n.stone)
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
        let pills = card.buttons ? [(NudgeButton.add, pill(n.add, primary: true)), (NudgeButton.notNow, pill(n.notNow, primary: false))] : []
        let pillTall = pills.map(\.1.size.height).max() ?? 0
        let full = CGSize(width: n.width, height: n.pad + head + trailTall + n.gap + said.height.rounded(.up) + (pills.isEmpty ? 0 : n.gap + pillTall) + n.pad)

        let asked = NudgePlaces.Asked(text: card.text, w: full.width, h: full.height, beside: card.beside, texts: texts)
        let was = nudges.asked == asked ? nudges.found : nil
        // A card that is going stays where it was, whatever has come up since.
        let place = card.leave > 0 && was != nil ? was! : Layout.nudge(size: (full.width, full.height), beside: card.beside, texts: texts, taken: taken + held(marks, of: card.id, cursor: cursor, avoiding: texts), was: was, width: width, height: height, tokens: tokens)
        (nudges.asked, nudges.found) = (asked, place)

        ctx.saveGState()
        defer { ctx.restoreGState() }
        let going = card.leave > 0
        let alpha = going ? 1 - card.leave : card.appear
        let grow = going ? 1 - (1 - n.leaveTo) * card.leave : n.from + (1 - n.from) * card.appear
        ctx.translateBy(x: place.box.x + place.box.w / 2, y: place.box.y + (going ? 0 : n.rise * (1 - card.appear)))
        ctx.scaleBy(x: place.scale * grow, y: place.scale * grow)
        ctx.translateBy(x: -full.width / 2, y: 0)
        ctx.setAlpha(alpha)
        surface(CGPath(roundedRect: CGRect(origin: .zero, size: full), cornerWidth: n.radius, cornerHeight: n.radius, transform: nil), ctx)
        // Each row fades in and rises on its own, after the card.
        func row(_ index: Int, _ draw: (Double) -> Void) {
            let come = card.rows[index]
            ctx.setAlpha(alpha * come)
            draw(going ? 0 : n.rowRise * (1 - come))
        }
        var y = n.pad
        row(0) { rise in
            orb(middle: CGPoint(x: n.pad + n.avatar / 2, y: y + rise + head / 2), across: n.avatar, clock: 0, ctx)
            name.draw(at: CGPoint(x: n.pad + beyond, y: y + rise + (head - name.size().height) / 2))
            if !card.trail.isEmpty { trail.draw(with: CGRect(x: n.pad + beyond, y: y + rise + head + n.trailGap, width: inner - beyond, height: trailSize.height.rounded(.up)), options: wrapped) }
        }
        y += head + trailTall + n.gap
        row(1) { rise in message.draw(with: CGRect(x: n.pad, y: y + rise, width: inner, height: said.height.rounded(.up)), options: wrapped) }
        y += said.height.rounded(.up) + n.gap
        var drawn = [Drawn(what: "nudge", id: card.id, box: place.box)]
        var x = n.pad
        for (button, pill) in pills {
            let rect = CGRect(x: x, y: y, width: pill.size.width, height: pill.size.height)
            row(2) { rise in
                ctx.saveGState()
                // A held button, or the one he pressed while the card waits for what it asked, is drawn smaller.
                let shrink = card.held == button || card.answered == button ? n.pressed : 1
                ctx.translateBy(x: rect.midX, y: rect.midY + rise)
                ctx.scaleBy(x: shrink, y: shrink)
                let shape = CGRect(x: -rect.width / 2, y: -rect.height / 2, width: rect.width, height: rect.height)
                ctx.addPath(CGPath(roundedRect: shape, cornerWidth: rect.height / 2, cornerHeight: rect.height / 2, transform: nil))
                ctx.setFillColor(button == .add ? ink : mist)
                ctx.fillPath()
                pill.label.draw(at: CGPoint(x: shape.minX + n.buttonPadX, y: -pill.label.size().height / 2))
                ctx.restoreGState()
            }
            // Where a click on it is taken: its place on the card at rest, offered only while the card can be pressed.
            if !going, card.answered == nil {
                let s = place.scale
                drawn.append(Drawn(what: "button", id: button.rawValue, box: Box(x: place.box.x + s * rect.minX, y: place.box.y + s * rect.minY, w: s * rect.width, h: s * rect.height)))
            }
            x += pill.size.width + n.buttonGap
        }
        return drawn
    }
}
