import CoreGraphics
import Foundation

/// Where the pen goes for a mark, as points in the order they are drawn. The painter inks along it and the pointer
/// rides its tip, so both come from here.
enum Pen {
    private static func phase(_ key: String) -> Double {
        var hash: UInt64 = 5381
        for byte in key.utf8 { hash = hash &* 33 &+ UInt64(byte) }
        return Double(hash % 628) / 100
    }

    static func path(of mark: MarkPicture, tokens: Tokens, avoiding texts: [Box]) -> [CGPoint] {
        let m = tokens.mark
        let box = mark.box.grown(m.pad)
        let seed = phase(mark.key)
        switch mark.kind {
        case .ring:
            let steps = 72, sweep = 2 * Double.pi * (1 + m.overshoot), from = -0.8 * Double.pi
            return (0...steps).map { step in
                let u = Double(step) / Double(steps)
                let angle = from + sweep * u
                let wobble = 1 + m.wobble * sin(3 * angle + seed) + 0.05 * u
                return CGPoint(x: box.x + box.w / 2 + box.w / 2 * m.ringWide * wobble * cos(angle), y: box.y + box.h / 2 + box.h / 2 * m.ringTall * wobble * sin(angle))
            }
        case .underline, .wavy:
            // The line stays inside the gap between this line of text and the next one down.
            let bottom = mark.box.y + mark.box.h
            let below = texts.filter { $0.y >= bottom - 1 && $0.x < mark.box.x + mark.box.w && mark.box.x < $0.x + $0.w }.map { $0.y - bottom }.min() ?? 100
            let room = max(below - m.width, 0)
            let wave = min(3, max(room / 2, 1.4)), sag = min(1.5, max(room / 2, 0.4))
            let steps = 40, y = bottom + min(4, max(below / 2, 1.5))
            return (0...steps).map { step in
                let u = Double(step) / Double(steps)
                let lift = mark.kind == .wavy ? wave * sin(u * mark.box.w / 5) : sag * sin(u * Double.pi + seed)
                return CGPoint(x: mark.box.x - 2 + (mark.box.w + 4) * u, y: y + lift)
            }
        case .box:
            // A rounded box that hugs what it marks. Its top and bottom sit in the middle of the gap to the nearest
            // text outside it, at most 5 points out, and pulled in a little where the read box overlaps its neighbour.
            let b = mark.box
            let outside = texts.filter { text in
                let middle = text.y + text.h / 2
                return text.x < b.x + b.w && b.x < text.x + text.w && !(middle > b.y && middle < b.y + b.h)
            }
            func room(_ gaps: [Double]) -> Double { min(5, max(-2, (gaps.min() ?? 100) / 2 - m.width / 2)) }
            let up = room(outside.filter { $0.y + $0.h / 2 <= b.y }.map { b.y - ($0.y + $0.h) })
            let down = room(outside.filter { $0.y + $0.h / 2 >= b.y + b.h }.map { $0.y - (b.y + b.h) })
            return rounded(Box(x: b.x - 7, y: b.y - up, w: b.w + 14, h: b.h + up + down), radius: 8)
        case .bracket:
            let x = box.x - 6, arm = 9.0
            return [CGPoint(x: x + arm, y: box.y), CGPoint(x: x, y: box.y + 1), CGPoint(x: x - 1, y: box.y + box.h - 1), CGPoint(x: x + arm, y: box.y + box.h)]
        }
    }

    /// A rounded box, drawn clockwise from its top-left corner and closed a little past where it began.
    private static func rounded(_ r: Box, radius wanted: Double) -> [CGPoint] {
        let radius = min(wanted, r.h / 2, r.w / 2)
        let corners: [(cx: Double, cy: Double, from: Double)] = [
            (r.x + r.w - radius, r.y + radius, -0.5), (r.x + r.w - radius, r.y + r.h - radius, 0),
            (r.x + radius, r.y + r.h - radius, 0.5), (r.x + radius, r.y + radius, 1),
        ]
        var points = [CGPoint(x: r.x + radius, y: r.y)]
        for corner in corners {
            for step in 0...6 {
                let angle = (corner.from + 0.5 * Double(step) / 6) * Double.pi
                points.append(CGPoint(x: corner.cx + radius * cos(angle), y: corner.cy + radius * sin(angle)))
            }
        }
        return points + [CGPoint(x: r.x + radius + 10, y: r.y)]
    }

    /// The path cut at a share of its length: the points inked so far, and the tip.
    static func reach(_ points: [CGPoint], _ share: Double) -> (inked: [CGPoint], tip: CGPoint) {
        guard let first = points.first else { return ([], .zero) }
        var lengths = [0.0]
        for i in points.indices.dropFirst() { lengths.append(lengths[i - 1] + hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)) }
        let reach = (lengths.last ?? 0) * min(max(share, 0), 1)
        var inked = [first]
        for i in points.indices.dropFirst() {
            if lengths[i] <= reach {
                inked.append(points[i])
            } else {
                let part = (reach - lengths[i - 1]) / max(lengths[i] - lengths[i - 1], 0.001)
                inked.append(CGPoint(x: points[i - 1].x + (points[i].x - points[i - 1].x) * part, y: points[i - 1].y + (points[i].y - points[i - 1].y) * part))
                break
            }
        }
        return (inked, inked.last ?? first)
    }
}
