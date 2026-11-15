import AppKit

extension Painter {
    /// The heights of the bars of the wave that says it is listening, as shares of the tallest: a dotted line with a
    /// few bars standing up in it, after the wave in the design kit's voice pill.
    private static let wave: [Double] = [0.15, 0.15, 0.5, 0.15, 0.9, 0.35, 0.15, 0.65, 0.15, 0.15]

    /// The capsule, in the look of the design kit's voice pill: a light pill with a soft shadow and words in ink. At
    /// rest it is collapsed to the kit's orb, or to a cross while paral's ink is on the page. Listening, a small wave
    /// stands before his words, which are grey while they are still being heard and black once settled. Answering,
    /// the words to come are grey and settle to black as they are said. The kit's pill also has a stop and a send
    /// button; paral is held and let go, so it has neither.
    func capsule(_ c: CapsulePicture, clock: Double, _ ctx: CGContext) -> Box {
        // A trail of steps sits in its own band above the words, so the capsule is that much taller while it shows one.
        let band = c.trail.isEmpty ? 0 : Layout.band(tokens)
        let box = Layout.capsule(open: c.open, closes: c.closes, taller: band, width: width, height: height, tokens: tokens)
        let rect = CGRect(x: box.x, y: box.y, width: box.w, height: box.h)
        let radius = min(box.h / 2, tokens.capsule.radius)
        let shape = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
        if c.open < 0.05, !c.closes {
            orb(middle: CGPoint(x: rect.midX, y: rect.midY), across: box.w, clock: 0, ctx)
            return box
        }
        surface(shape, ctx)
        if c.closes, c.open < 0.05 {
            let arm = box.w * 0.19
            ctx.setStrokeColor(ink)
            ctx.setLineWidth(1.8)
            ctx.setLineCap(.round)
            for turn in [1.0, -1.0] {
                ctx.move(to: CGPoint(x: rect.midX - arm, y: rect.midY - arm * turn))
                ctx.addLine(to: CGPoint(x: rect.midX + arm, y: rect.midY + arm * turn))
            }
            ctx.strokePath()
        }
        guard c.open > 0.9 else { return box }
        let inner = rect.insetBy(dx: tokens.capsule.pad, dy: 8)
        switch c.look {
        case .rest:
            break
        case .listening:
            // The wave stands at the pill's left end, and his words fill in beside it.
            let bars = Painter.wave, step = 5.0, tall = tokens.capsule.type
            ctx.setFillColor(ink.copy(alpha: 0.55) ?? ink)
            for (index, share) in bars.enumerated() {
                let h = max(tall * share, 2.5)
                ctx.addPath(CGPath(roundedRect: CGRect(x: inner.minX + Double(index) * step, y: inner.midY - h / 2, width: 2.5, height: h), cornerWidth: 1.25, cornerHeight: 1.25, transform: nil))
            }
            ctx.fillPath()
            let said = CGRect(x: inner.minX + Double(bars.count) * step + 10, y: inner.minY, width: inner.width - 2 * (Double(bars.count) * step + 10), height: inner.height)
            // A word still being heard is grey, and black once it has settled: the other way round from brightness.
            if c.words.isEmpty { write([Word(text: c.note ?? "", bright: tokens.dim)], in: said) } else { write(c.words.map { Word(text: $0.text, bright: $0.bright >= 1 ? tokens.dim : 1) }, in: said) }
        case .speaking:
            guard !c.trail.isEmpty else { write(c.words, in: inner); break }
            // The steps paral took, small and in a row, each lit once it is reached; the words go below them.
            let steps = c.trail.map { inked($0.text.uppercased(), size: tokens.capsule.tagType, color: ($0.bright >= 1 ? cardinal : ink).copy(alpha: $0.bright >= 1 ? 1 : $0.bright) ?? ink, weight: .semibold) }
            let gap = 18.0
            let total = steps.reduce(0) { $0 + $1.size().width } + gap * Double(steps.count - 1)
            var x = inner.midX - total / 2
            for (index, step) in steps.enumerated() {
                step.draw(at: CGPoint(x: x, y: inner.minY + 1))
                x += step.size().width
                if index < steps.count - 1 {
                    inked("›", size: tokens.capsule.tagType, color: ink.copy(alpha: 0.5) ?? ink, weight: .semibold).draw(at: CGPoint(x: x + gap / 2 - 3, y: inner.minY + 1))
                    x += gap
                }
            }
            write(c.words, in: CGRect(x: inner.minX, y: inner.minY + band, width: inner.width, height: inner.height - band))
        case .thinking:
            let tag = inked((c.note ?? "").uppercased(), size: tokens.capsule.tagType, color: ink.copy(alpha: 0.6) ?? ink, weight: .semibold)
            let size = tag.size()
            let gap = Painter.waitingGap
            let x = inner.midX - (3 * gap + 10 + size.width) / 2
            waiting(at: CGPoint(x: x + gap + 3, y: inner.midY), clock: clock, in: ink, ctx)
            tag.draw(at: CGPoint(x: x + 3 * gap + 10, y: inner.midY - size.height / 2))
        case .failed:
            let head = inked(tokens.strings.failed + "  ", size: tokens.capsule.type, color: cardinal, weight: .bold)
            let rest = c.note ?? ""
            let words = rest.split(separator: " ").map { Word(text: String($0), bright: 1) }
            let lead = head.size().width
            head.draw(at: CGPoint(x: inner.minX, y: inner.minY + 2))
            write(words, in: inner, firstIndent: lead, small: true)
        }
        return box
    }

    /// Up to two lines, the ones around the newest bright word; each word at its own brightness.
    func write(_ words: [Word], in area: CGRect, firstIndent: Double = 0, small: Bool = false) {
        let size = small ? tokens.capsule.type - 3 : tokens.capsule.type
        let space = inked(" ", size: size, color: ink, weight: .medium).size().width
        var lines: [[(Word, Double)]] = [[]]
        var used = firstIndent
        var newest = 0
        for word in words {
            let w = inked(word.text, size: size, color: ink, weight: .medium).size().width
            if used + w > area.width, !(lines.last ?? []).isEmpty {
                lines.append([])
                used = 0
            }
            lines[lines.count - 1].append((word, w))
            used += w + space
            if word.bright >= 1 { newest = lines.count - 1 }
        }
        let first = min(max(0, newest - (newest == lines.count - 1 && lines.count > 1 ? 1 : 0)), max(0, lines.count - 2))
        let shown = Array(lines[first..<min(lines.count, first + 2)])
        let lineHeight = size * 1.32
        var y = area.midY - lineHeight * Double(shown.count) / 2
        for (row, line) in shown.enumerated() {
            let lineWidth = line.reduce(0) { $0 + $1.1 } + space * Double(max(0, line.count - 1))
            let indented = first == 0 && row == 0 && firstIndent > 0
            var x = indented ? area.minX + firstIndent : area.midX - lineWidth / 2
            for (word, w) in line {
                inked(word.text, size: size, color: ink.copy(alpha: word.bright) ?? ink, weight: .medium).draw(at: CGPoint(x: x, y: y))
                x += w + space
            }
            y += lineHeight
        }
    }
}
