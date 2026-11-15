import CoreGraphics
import Foundation

extension Layout {
    /// How much of `a` lies on `b`, in square points.
    private static func overlap(_ a: Box, _ b: Box) -> Double {
        max(0, min(a.x + a.w, b.x + b.w) - max(a.x, b.x)) * max(0, min(a.y + a.h, b.y + b.h) - max(a.y, b.y))
    }

    /// Where the nudge card goes, and how far it is shrunk, for a card of `size` at its full size.
    ///
    /// Its home is beside the line it is about: level with that line and `nudge.beside` past the right end of the
    /// page's text at that height (the text column), the design kit's place for it. With no line (the look sent the
    /// way to it) its home is at the right side, above the capsule. It goes to the free place nearest its home, so to
    /// the right of the text when there is room there. Free means inside the display and below the menu bar
    /// (`nudge.edge`, `nudge.top`), and `nudge.clear` from every read line, every box in `taken` and the open
    /// capsule, with room below for the rise it comes up with. Where no place is free at its full size it is shrunk
    /// by `nudge.shrink` at a time down to `nudge.least`; where none is free even then, it goes where it covers least.
    /// `was` is the place it had a moment before: it is kept while it is still free, so the card does not move.
    public static func nudge(size: (w: Double, h: Double), beside line: Box?, texts: [Box], taken: [Box], was: (box: Box, scale: Double)? = nil, width: Double, height: Double, tokens: Tokens) -> (box: Box, scale: Double) {
        let n = tokens.nudge
        // The pill's band at the foot is the pill's alone.
        let capsule = foot(width: width, height: height, tokens: tokens)
        let shut = (texts + taken + [capsule]).map { $0.grown(n.clear) }
        func covered(_ b: Box) -> Double {
            let rising = Box(x: b.x, y: b.y, w: b.w, h: b.h + n.rise)
            let outside = b.x < n.edge || b.y < n.top || b.x + b.w > width - n.edge || rising.y + rising.h > height - n.edge
            return shut.reduce(0) { $0 + overlap(rising, $1) } + (outside ? b.w * b.h : 0)
        }
        if let was, covered(was.box) == 0 { return was }
        var least: (cost: Double, box: Box, scale: Double)?
        let steps = n.shrink > 0 ? max(0, Int(((1 - n.least) / n.shrink).rounded())) : 0
        for step in 0...steps {
            let scale = 1 - Double(step) * n.shrink, w = size.w * scale, h = size.h * scale
            let home: CGPoint
            if let line {
                let top = line.y + line.h / 2 - h / 2
                let column = texts.filter { $0.y < top + h && top < $0.y + $0.h }.map { $0.x + $0.w }.max() ?? 0
                home = CGPoint(x: max(column, line.x + line.w) + n.beside, y: top)
            } else {
                home = CGPoint(x: width - n.edge - w, y: capsule.y - n.clear - n.rise - h)
            }
            // The home itself, held inside the display, then every place on a grid of `nudge.cell`.
            let held = Box(x: min(max(home.x, n.edge), width - n.edge - w), y: min(max(home.y, n.top), height - n.edge - n.rise - h), w: w, h: h)
            var places = [held]
            for y in stride(from: n.top, through: height - n.edge - n.rise - h, by: max(n.cell, 1)) {
                for x in stride(from: n.edge, through: width - n.edge - w, by: max(n.cell, 1)) { places.append(Box(x: x, y: y, w: w, h: h)) }
            }
            var nearest: (far: Double, box: Box)?
            for box in places {
                let cost = covered(box), far = hypot(box.x - home.x, box.y - home.y)
                if cost == 0, far < (nearest?.far ?? .infinity) { nearest = (far, box) }
                if cost > 0, cost < (least?.cost ?? .infinity) { least = (cost, box, scale) }
            }
            if let nearest { return (nearest.box, scale) }
        }
        return least.map { ($0.box, $0.scale) } ?? (Box(x: n.edge, y: n.top, w: size.w * n.least, h: size.h * n.least), n.least)
    }
}
