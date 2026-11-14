import AppKit

extension Painter {
    func capsule(_ c: CapsulePicture, clock: Double, _ ctx: CGContext) -> Box {
        let box = Layout.capsule(open: c.open, closes: c.closes, width: width, height: height, tokens: tokens)
        let rect = CGRect(x: box.x, y: box.y, width: box.w, height: box.h)
        let radius = min(box.h / 2, tokens.capsule.radius)
        let shape = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
        ctx.addPath(shape)
        ctx.setFillColor(ink)
        ctx.fillPath()
        ctx.addPath(shape)
        ctx.setStrokeColor(paper.copy(alpha: 0.85) ?? paper)
        ctx.setLineWidth(1.5)
        ctx.strokePath()
        if c.closes, c.open < 0.05 {
            let arm = box.w * 0.19
            ctx.setStrokeColor(paper)
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
            if c.words.isEmpty { write([Word(text: c.note ?? "", bright: tokens.dim)], in: inner) } else { write(c.words, in: inner) }
        case .speaking:
            write(c.words, in: inner)
        case .thinking:
            let tag = inked((c.note ?? "").uppercased(), size: tokens.capsule.tagType, color: paper.copy(alpha: 0.7) ?? paper, weight: .semibold)
            let size = tag.size()
            let dots = 3, gap = 12.0
            let total = Double(dots) * gap + 10 + size.width
            var x = inner.midX - total / 2
            for dot in 0..<dots {
                let alpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(clock / 180 - Double(dot) * 0.9))
                ctx.setFillColor(paper.copy(alpha: alpha) ?? paper)
                ctx.fillEllipse(in: CGRect(x: x, y: inner.midY - 3, width: 6, height: 6))
                x += gap
            }
            tag.draw(at: CGPoint(x: x + 10, y: inner.midY - size.height / 2))
        case .failed:
            let head = inked(tokens.strings.failed + "  ", size: tokens.capsule.type, color: accent, weight: .bold)
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
        let space = inked(" ", size: size, color: paper, weight: .medium).size().width
        var lines: [[(Word, Double)]] = [[]]
        var used = firstIndent
        var newest = 0
        for word in words {
            let w = inked(word.text, size: size, color: paper, weight: .medium).size().width
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
                inked(word.text, size: size, color: paper.copy(alpha: word.bright) ?? paper, weight: .medium).draw(at: CGPoint(x: x, y: y))
                x += w + space
            }
            y += lineHeight
        }
    }
}
