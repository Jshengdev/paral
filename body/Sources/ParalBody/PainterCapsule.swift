import AppKit

extension Painter {
    /// The voice pill, after the design kit's: one light capsule whose size changes between the orb it shuts into at
    /// rest (`PainterOrb.swift`, the designer's orb handoff) and the full pill (a stop control, the wave, a send
    /// control), with the bubble that carries its words above it (`PainterBubble.swift`). The pill grows out of the
    /// orb: its surface comes in over the first half of the opening as the orb goes, and its controls over the
    /// second. At rest with paral's ink on the page the cross that clears it sits beside the orb. The two controls
    /// are drawn as the kit draws them and take no click: paral is held and let go. It stays at the bottom centre and
    /// covers what is under it; `texts` no longer moves it. Gives back the capsule's box, the cross's own when it
    /// carries one, the bubble's, and the orb's square of light while it is drawn.
    func capsule(_ c: CapsulePicture, avoiding texts: [Box], _ ctx: CGContext) -> (box: Box, cross: Box?, bubble: Box?, orb: Box?) {
        let k = tokens.capsule
        let (core, box, full) = places(c, avoiding: texts)
        let rect = CGRect(x: core.x, y: core.y, width: core.w, height: core.h)
        let radius = min(core.h / 2, k.radius)
        let bubble = c.bubble > 0 ? self.bubble(c, over: full, ctx) : nil
        ctx.saveGState()
        defer { ctx.restoreGState() }
        if c.open > 0 {
            ctx.setAlpha(min(1, 2 * c.open))
            ctx.beginTransparencyLayer(auxiliaryInfo: nil)
            surface(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil), ctx)
            ctx.endTransparencyLayer()
        }
        let glow = c.orb.flatMap { orb($0, alpha: 1 - 2 * c.open, ctx) }
        if c.closes, c.open < 0.05 {
            let cross = Layout.cross(width: width, height: floor, tokens: tokens)
            let circle = CGRect(x: cross.x, y: cross.y, width: cross.w, height: cross.h)
            let middle = CGPoint(x: circle.midX, y: circle.midY), arm = cross.w * 0.19
            ctx.setAlpha(1)
            surface(CGPath(ellipseIn: circle, transform: nil), ctx)
            ctx.setStrokeColor(ink)
            ctx.setLineWidth(1.8)
            ctx.setLineCap(.round)
            for turn in [1.0, -1.0] {
                ctx.move(to: CGPoint(x: middle.x - arm, y: middle.y - arm * turn))
                ctx.addLine(to: CGPoint(x: middle.x + arm, y: middle.y + arm * turn))
            }
            ctx.strokePath()
            return (box, cross, bubble, glow)
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
        return (box, nil, bubble, glow)
    }

    /// Where the capsule is at this moment: its own shape (the pill, or the orb's blob when it is shut), all it takes
    /// with the cross beside the orb at rest, and the full pill where it sits open.
    func places(_ c: CapsulePicture, avoiding texts: [Box]) -> (core: Box, box: Box, full: Box) {
        let core = Layout.pill(open: c.open, width: width, height: floor, tokens: tokens)
        let full = Layout.pill(open: 1, width: width, height: floor, tokens: tokens)
        guard c.closes, c.open < 0.05 else { return (core, core, full) }
        let cross = Layout.cross(width: width, height: floor, tokens: tokens)
        let top = min(core.y, cross.y)
        return (core, Box(x: core.x, y: top, w: cross.x + cross.w - core.x, h: max(core.y + core.h, cross.y + cross.h) - top), full)
    }

    /// What the capsule takes at this moment, for an arrow to keep off: the pill, or the orb with its cross, and the
    /// bubble while it is up.
    func takes(_ c: CapsulePicture, avoiding texts: [Box]) -> Box {
        let (_, pill, full) = places(c, avoiding: texts)
        guard c.bubble > 0, let words = bubble(c, over: full, nil) else { return pill }
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
