import AppKit

extension Painter {
    /// The bubble above the pill, after the kit's transcript bubble: a light card, centred over the pill and `gap`
    /// above it, that carries every word the pill has to say. While he holds the key, his words on one line, those
    /// still being heard in stone, with a caret that blinks after them, the oldest dropped when the line is too long
    /// so the newest stay in view; while paral thinks, his words in ink. Answering, the sentence being said, up to two
    /// lines round its newest said word, its words going from stone to ink. A line said without being asked is the
    /// nudge card's; only where the card finds no place clear of the page's words is it here, with its trail in small
    /// capitals above its words. A failure: FAILED in cardinal and the reason. It rises out of the pill as it comes. Gives back its box, or nil when it has nothing to say; with no context it is only measured.
    @discardableResult
    func bubble(_ c: CapsulePicture, over pill: Box, _ ctx: CGContext?) -> Box? {
        let b = tokens.bubble, size = tokens.capsule.type, stone = color(tokens.stone)
        let caret = c.caret.map { _ in b.caretGap + b.caretWidth } ?? 0
        let room = b.maxWidth - 2 * b.padX
        let words = c.words.map { inked($0.text, size: size, color: $0.bright >= 1 ? ink : stone) }
        var lines: [[NSAttributedString]]
        switch c.look {
        case .listening, .thinking:
            lines = [words.isEmpty ? [inked(c.note ?? "", size: size, color: stone)] : newest(words, room: room - caret, size: size)]
        case .failed:
            let reason = (c.note ?? "").split(separator: " ").map { inked(String($0), size: size - 3, color: ink, weight: .medium) }
            lines = Array(laid([inked(tokens.strings.failed, size: size, color: cardinal, weight: .bold)] + reason, room: room, size: size).prefix(3))
        case .speaking, .rest:
            let all = laid(words, room: room, size: size)
            // The two lines round the newest word said, as the capsule always showed them.
            var newest = 0, count = 0
            for (row, line) in all.enumerated() {
                for _ in line { if c.words[count].bright >= 1 { newest = row }; count += 1 }
            }
            let first = min(max(0, newest - (newest == all.count - 1 && all.count > 1 ? 1 : 0)), max(0, all.count - 2))
            lines = Array(all[first..<min(all.count, first + 2)])
        }
        guard lines.contains(where: { !$0.isEmpty && !$0.allSatisfy { $0.length == 0 } }) else { return nil }
        let space = inked(" ", size: size, color: ink).size().width, line = size * b.leading
        func wide(_ row: [NSAttributedString]) -> Double { row.reduce(0) { $0 + $1.size().width } + space * Double(max(0, row.count - 1)) }
        let steps = c.trail.map { inked($0.text.uppercased(), size: tokens.capsule.tagType, color: ($0.bright >= 1 ? cardinal : ink).copy(alpha: $0.bright >= 1 ? 1 : $0.bright) ?? ink, weight: .semibold) }
        let band = steps.isEmpty ? 0 : Layout.band(tokens), gap = 18.0
        let trail = steps.reduce(0) { $0 + $1.size().width } + gap * Double(max(0, steps.count - 1))
        let w = min(b.maxWidth, max(lines.map(wide).max() ?? 0, trail) + caret + 2 * b.padX)
        let h = Double(lines.count) * line + 2 * b.padY + band
        let x = min(max(pill.x + pill.w / 2 - w / 2, tokens.band), width - tokens.band - w)
        let box = Box(x: x, y: pill.y - b.gap - h, w: w, h: h)
        guard let ctx else { return box }

        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(c.bubble)
        ctx.translateBy(x: 0, y: (1 - c.bubble) * b.rise)
        let card = CGRect(x: box.x, y: box.y, width: box.w, height: box.h)
        surface(CGPath(roundedRect: card, cornerWidth: b.radius, cornerHeight: b.radius, transform: nil), ctx)
        // A word longer than the bubble is widest (a long address) is cut at its edge rather than drawn past it.
        ctx.clip(to: card.insetBy(dx: b.padX / 2, dy: 0))
        // The steps paral took, small and in a row, each lit once it is reached; the words go below them.
        var across = card.midX - trail / 2
        for (index, step) in steps.enumerated() {
            step.draw(at: CGPoint(x: across, y: card.minY + b.padY))
            across += step.size().width
            if index < steps.count - 1 {
                inked("›", size: tokens.capsule.tagType, color: ink.copy(alpha: 0.5) ?? ink, weight: .semibold).draw(at: CGPoint(x: across + gap / 2 - 3, y: card.minY + b.padY))
                across += gap
            }
        }
        // Each word sits on the line's baseline, a smaller word too: its top is lowered by what its face rises less.
        let face = faces.face(size, .regular)
        func top(_ word: NSAttributedString) -> Double {
            let own = (word.length > 0 ? word.attribute(.font, at: 0, effectiveRange: nil) as? NSFont : nil) ?? face
            return (line - (face.ascender - face.descender)) / 2 + face.ascender - own.ascender
        }
        var y = card.minY + b.padY + band
        for row in lines {
            var x = card.minX + b.padX
            for word in row {
                word.draw(at: CGPoint(x: x, y: y + top(word)))
                x += word.size().width + space
            }
            if c.caret == true {
                ctx.setFillColor(ink)
                ctx.fill(CGRect(x: x - space + b.caretGap, y: y + (line - b.caretHeight) / 2, width: b.caretWidth, height: b.caretHeight))
            }
            y += line
        }
        return box
    }

    /// Words laid into lines no wider than `room`, a space apart.
    func laid(_ words: [NSAttributedString], room: Double, size: Double) -> [[NSAttributedString]] {
        let space = inked(" ", size: size, color: ink).size().width
        var lines: [[NSAttributedString]] = [[]]
        var used = 0.0
        for word in words {
            let w = word.size().width
            if used + w > room, !(lines.last ?? []).isEmpty {
                lines.append([])
                used = 0
            }
            lines[lines.count - 1].append(word)
            used += w + space
        }
        return lines
    }

    /// One line of the newest words that fit in `room`: the oldest go first, and an ellipsis says that some went.
    func newest(_ words: [NSAttributedString], room: Double, size: Double) -> [NSAttributedString] {
        let space = inked(" ", size: size, color: ink).size().width, more = inked("…", size: size, color: ink)
        var kept: [NSAttributedString] = []
        var used = 0.0
        for word in words.reversed() {
            let w = word.size().width + (kept.isEmpty ? 0 : space)
            if used + w > room - (kept.count + 1 < words.count ? more.size().width + space : 0), !kept.isEmpty { return [more] + kept }
            kept.insert(word, at: 0)
            used += w
        }
        return kept
    }
}
