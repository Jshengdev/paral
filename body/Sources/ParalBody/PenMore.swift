import CoreGraphics
import Foundation

/// Where the pen goes for the two marks that say something of a line rather than point at it: a tick left of it
/// ("this is done") and a strike through it ("this has passed"). Their shapes follow the geometry a teammate drew
/// for them on 2026-11-15, rewritten here with the tokens; the shares below are the shape, not sizes.
extension Pen {
    /// A hand tick to the left of a line, as tall as the line up to `mark.tickMost`, `mark.tickGap` clear of its first
    /// word. The short stroke first and then the long one, as a hand makes it, each with a slight bow and a wobble too
    /// small to see as one, so it reads as a hand and not a letter.
    static func tick(beside line: Box, seed: Double, tokens: Tokens) -> [CGPoint] {
        let m = tokens.mark, size = min(line.h, m.tickMost)
        let left = line.x - m.tickGap - size, top = line.y + line.h / 2 - size / 2
        // The corners of the tick in its square: the short stroke's start, the bottom, the long stroke's end.
        let corners: [(x: Double, y: Double)] = [(0.06, 0.52), (0.36, 0.86), (0.98, 0.08)]
        var points: [CGPoint] = []
        for leg in 0..<2 {
            let a = corners[leg], b = corners[leg + 1], steps = leg == 0 ? 5 : 9, bow = leg == 0 ? 0.03 : -0.04
            for step in (leg == 0 ? 0 : 1)...steps {
                let u = Double(step) / Double(steps)
                let lift = sin(u * Double.pi) * bow, wobble = 0.012 * sin(7 * u + seed)
                points.append(CGPoint(x: left + size * (a.x + (b.x - a.x) * u + wobble), y: top + size * (a.y + (b.y - a.y) * u + lift)))
            }
        }
        return points
    }

    /// One line through the middle of the words, rising a little to the right and running `mark.strikePast` past each
    /// end. It crosses the words on purpose: it is the one mark that does.
    static func strike(through line: Box, seed: Double, tokens: Tokens) -> [CGPoint] {
        let past = tokens.mark.strikePast, steps = 24, h = line.h, middle = line.y + line.h / 2
        return (0...steps).map { step in
            let u = Double(step) / Double(steps)
            let rise = h * 0.07 * (0.5 - u), sag = sin(u * Double.pi) * h * 0.04, wobble = h * 0.015 * sin(9 * u + seed)
            return CGPoint(x: line.x - past + (line.w + 2 * past) * u, y: middle + rise + sag + wobble)
        }
    }
}
