import AppKit

extension Painter {
    /// The voice pill, after the design kit's: one light capsule whose size changes between the collapsed pill (a
    /// row of dots) and the full pill (a stop control, the wave, a send control), with the bubble that carries its
    /// words above it (`PainterBubble.swift`). At rest with paral's ink on the page it is the cross that clears it,
    /// wearing the logo mark and the name. The two controls are drawn as the kit draws them and take no click: paral
    /// is held and let go. Open, it sits where neither it nor its bubble lies on the page's read text
    /// (`Layout.pillMiddle`). Gives back the capsule's box, the cross's own when it carries one, and the bubble's.
    func capsule(_ c: CapsulePicture, avoiding texts: [Box], _ ctx: CGContext) -> (box: Box, cross: Box?, bubble: Box?) {
        let k = tokens.capsule
        let middle = Layout.pillMiddle(texts: texts, width: width, height: floor, tokens: tokens)
        let core = Layout.pill(open: c.open, closes: c.closes, middle: middle, width: width, height: floor, tokens: tokens)
        // At rest with paral's ink on the page the capsule is a cross that clears it. A cross alone over a line of the
        // page reads as a stray button, so it wears the logo and the name to its left: whose cross this is. The cross
        // keeps its place, which is where a click is taken; the room for the name opens as the capsule shuts. The
        // logo is the resting one, and the room round it is what is left of the cross's circle.
        let name = inked(tokens.strings.name, size: k.tagType, color: ink, weight: .medium)
        let room = (k.restClose - k.rest) / 2
        let worn = c.closes ? (3 * room + k.rest + name.size().width) * (1 - c.open) : 0
        let box = Box(x: core.x - worn, y: core.y, w: core.w + worn, h: core.h)
        let rect = CGRect(x: box.x, y: box.y, width: box.w, height: box.h)
        let radius = min(box.h / 2, k.radius)
        let full = Layout.pill(open: 1, middle: middle, width: width, height: floor, tokens: tokens)
        let bubble = c.bubble > 0 ? self.bubble(c, over: full, ctx) : nil
        surface(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil), ctx)
        if c.closes, c.open < 0.05 {
            let middle = CGPoint(x: core.x + core.w / 2, y: core.y + core.h / 2), arm = core.w * 0.19
            ctx.setStrokeColor(ink)
            ctx.setLineWidth(1.8)
            ctx.setLineCap(.round)
            for turn in [1.0, -1.0] {
                ctx.move(to: CGPoint(x: middle.x - arm, y: middle.y - arm * turn))
                ctx.addLine(to: CGPoint(x: middle.x + arm, y: middle.y + arm * turn))
            }
            ctx.strokePath()
            // The name and the logo are written from the cross leftward, so they stand still while the capsule shuts.
            let words = name.size(), left = middle.x - k.restClose / 2 - room - words.width
            name.draw(at: CGPoint(x: left, y: middle.y - words.height / 2))
            logo(middle: CGPoint(x: left - room - k.rest / 2, y: middle.y), across: k.rest, ctx)
            return (box, core, bubble)
        }
        // The collapsed pill's dots go as it opens, and the controls come in their place.
        ctx.saveGState()
        defer { ctx.restoreGState() }
        if !c.closes, c.open < 0.5 {
            ctx.setAlpha(1 - 2 * c.open)
            dots(Int(k.dots), across: rect.midX, at: rect.midY, ink: k.dotInk, ctx)
        }
        if c.open > 0.5 {
            ctx.setAlpha(2 * c.open - 1)
            controls(c, in: rect, ctx)
        }
        // While paral works and no cursor is on the page, the logo mark by the pill breathes, as the cursor would.
        if let working = c.working, c.open > 0.5 {
            ctx.setAlpha(1)
            logo(middle: CGPoint(x: full.x - k.gap - k.face / 2, y: full.y + full.h / 2), across: k.face * (1 + tokens.cursor.workGrows * working), ctx)
        }
        return (box, nil, bubble)
    }

    /// What the capsule takes at this moment, for an arrow to keep off: the pill, or the cross with its name, and the
    /// bubble while it is up.
    func takes(_ c: CapsulePicture, avoiding texts: [Box]) -> Box {
        let k = tokens.capsule
        let middle = Layout.pillMiddle(texts: texts, width: width, height: floor, tokens: tokens)
        let core = Layout.pill(open: c.open, closes: c.closes, middle: middle, width: width, height: floor, tokens: tokens)
        let name = inked(tokens.strings.name, size: k.tagType, color: ink, weight: .medium).size().width
        let worn = c.closes ? (3 * (k.restClose - k.rest) / 2 + k.rest + name) * (1 - c.open) : 0
        let pill = Box(x: core.x - worn, y: core.y, w: core.w + worn, h: core.h)
        guard c.bubble > 0, let words = bubble(c, over: Layout.pill(open: 1, middle: middle, width: width, height: floor, tokens: tokens), nil) else { return pill }
        let x = min(pill.x, words.x)
        return Box(x: x, y: words.y, w: max(pill.x + pill.w, words.x + words.w) - x, h: pill.y + pill.h - words.y)
    }

    /// What speaks at the bottom, for the arrow that leads to it: the full pill where it sits open, and above it the
    /// bubble as it is with the words it holds, so the arrow's way moves only when the words do.
    func speaker(_ c: CapsulePicture, avoiding texts: [Box]) -> Box {
        let middle = Layout.pillMiddle(texts: texts, width: width, height: floor, tokens: tokens)
        let pill = Layout.pill(open: 1, middle: middle, width: width, height: floor, tokens: tokens)
        guard let words = bubble(c, over: pill, nil) else { return pill }
        let x = min(pill.x, words.x)
        return Box(x: x, y: words.y, w: max(pill.x + pill.w, words.x + words.w) - x, h: pill.y + pill.h - words.y)
    }

    /// A row of `count` dots `wave.pitch` apart, centred at `across`, in ink at `ink`.
    func dots(_ count: Int, across: Double, at y: Double, ink share: Double, _ ctx: CGContext) {
        let w = tokens.wave
        ctx.setFillColor(ink.copy(alpha: share) ?? ink)
        for i in 0..<count {
            let x = across + (Double(i) - Double(count - 1) / 2) * w.pitch
            ctx.fillEllipse(in: CGRect(x: x - w.dot / 2, y: y - w.dot / 2, width: w.dot, height: w.dot))
        }
    }

    /// The send control's arrow in its own circle, as shares of the circle across: the kit's up arrow in a frame of 36.
    private static let arrow: [[(x: Double, y: Double)]] = [[(0.5, 25.0 / 36), (0.5, 11.0 / 36)], [(24.0 / 36, 17.0 / 36), (0.5, 11.0 / 36), (12.0 / 36, 17.0 / 36)]]

    /// The full pill's content, after the kit's: the stop control (a mist circle with an ink square), the wave, and
    /// the send control, ink with a white arrow while he is heard saying something, and mist with a stone arrow otherwise.
    func controls(_ c: CapsulePicture, in pill: CGRect, _ ctx: CGContext) {
        let k = tokens.capsule, w = tokens.wave
        let left = pill.midX - (2 * k.control + w.width + 2 * k.gap) / 2
        let stop = CGRect(x: left, y: pill.midY - k.control / 2, width: k.control, height: k.control)
        let wave = CGRect(x: stop.maxX + k.gap, y: pill.midY - w.height / 2, width: w.width, height: w.height)
        let send = CGRect(x: wave.maxX + k.gap, y: stop.minY, width: k.control, height: k.control)
        ctx.setFillColor(mist)
        ctx.fillEllipse(in: stop)
        let square = CGRect(x: stop.midX - k.stopSquare / 2, y: stop.midY - k.stopSquare / 2, width: k.stopSquare, height: k.stopSquare)
        ctx.addPath(CGPath(roundedRect: square, cornerWidth: k.stopCorner, cornerHeight: k.stopCorner, transform: nil))
        ctx.setFillColor(ink)
        ctx.fillPath()
        let ready = c.look == .listening && !c.words.isEmpty
        ctx.setFillColor(ready ? ink : mist)
        ctx.fillEllipse(in: send)
        ctx.setStrokeColor(ready ? paper : color(tokens.stone))
        ctx.setLineWidth(k.arrowLine)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)
        for stroke in Painter.arrow { ctx.addLines(between: stroke.map { CGPoint(x: send.minX + $0.x * send.width, y: send.minY + $0.y * send.height) }) }
        ctx.strokePath()
        self.wave(c, in: wave, ctx)
    }

    /// The mark each sample of a wave is drawn as, oldest first: a dot for a quiet one, a short bar, a tall bar.
    func marks(of wave: [Double]) -> [String] {
        wave.map { $0 < tokens.wave.quiet ? "dot" : $0 < tokens.wave.loud ? "short" : "tall" }
    }

    /// The wave, after the kit's: while he speaks, in ink, and while paral thinks or answers, in stone, scrolling from
    /// right to left one sample a pitch, each a dot, a short bar or a tall bar by how loud it was, fading at the two
    /// ends. With no samples it is the kit's still row of dots.
    func wave(_ c: CapsulePicture, in area: CGRect, _ ctx: CGContext) {
        let w = tokens.wave
        guard !c.wave.isEmpty else { return dots(Int(w.idleDots), across: area.midX, at: area.midY, ink: w.idleInk, ctx) }
        let colour = c.look == .listening ? ink : color(tokens.stone)
        let newest = area.maxX - tokens.capsule.pad
        for (index, mark) in marks(of: c.wave).enumerated() {
            let x = newest - (Double(c.wave.count - 1 - index) + c.scrolled) * w.pitch
            guard x >= area.minX, x <= area.maxX else { continue }
            let fade = min(1, min(x - area.minX, area.maxX - x) / max(w.fade * area.width, 1))
            let tall = mark == "tall" ? w.tall : w.short
            ctx.setFillColor(colour.copy(alpha: (mark == "dot" ? w.quietInk : 1) * fade) ?? colour)
            if mark == "dot" {
                ctx.fillEllipse(in: CGRect(x: x - w.dot / 2, y: area.midY - w.dot / 2, width: w.dot, height: w.dot))
            } else {
                ctx.addPath(CGPath(roundedRect: CGRect(x: x - w.bar / 2, y: area.midY - tall / 2, width: w.bar, height: tall), cornerWidth: w.bar / 2, cornerHeight: w.bar / 2, transform: nil))
                ctx.fillPath()
            }
        }
    }
}
