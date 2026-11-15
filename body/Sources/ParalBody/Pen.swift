import CoreGraphics
import Foundation

/// Where the pen goes for a mark, as points in the order they are drawn. The painter inks along it and the pointer
/// rides its tip, so both come from here.
enum Pen {
    static func phase(_ key: String) -> Double {
        var hash: UInt64 = 5381
        for byte in key.utf8 { hash = hash &* 33 &+ UInt64(byte) }
        return Double(hash % 628) / 100
    }

    /// The pen's path for a mark, kept inside the display: where the thing it marks runs to an edge or past it, the
    /// path runs along that edge, `mark.pad` in, so a loop is still seen to close.
    static func path(of mark: MarkPicture, tokens: Tokens, avoiding texts: [Box], inside display: (w: Double, h: Double)) -> [CGPoint] {
        let edge = tokens.mark.pad
        return shape(of: mark, tokens: tokens, avoiding: texts).map { CGPoint(x: min(max($0.x, edge), display.w - edge), y: min(max($0.y, edge), display.h - edge)) }
    }

    private static func shape(of mark: MarkPicture, tokens: Tokens, avoiding texts: [Box]) -> [CGPoint] {
        let m = tokens.mark
        let box = mark.box.grown(m.pad)
        let seed = phase(mark.key)
        switch mark.kind {
        case .ring:
            let steps = 72, sweep = 2 * Double.pi * (1 + m.overshoot), from = -0.8 * Double.pi
            // Between close lines the loop is flattened to pass through the middle of the gap to the nearest line
            // above or below, so it strikes through no word of theirs. The wobble and the loop's slow growth can
            // carry it 9 percent further out, which is allowed for.
            let b = mark.box
            let near = texts.filter { $0.x < b.x + b.w && b.x < $0.x + $0.w && !($0.y + $0.h / 2 > b.y && $0.y + $0.h / 2 < b.y + b.h) }
            func reach(_ gaps: [Double]) -> Double { min(box.h / 2 * m.ringTall, (b.h / 2 + max((gaps.min() ?? 100) / 2, 1)) / 1.09) }
            let up = reach(near.filter { $0.y + $0.h / 2 <= b.y }.map { b.y - ($0.y + $0.h) })
            let below = reach(near.filter { $0.y + $0.h / 2 >= b.y + b.h }.map { $0.y - (b.y + b.h) })
            return (0...steps).map { step in
                let u = Double(step) / Double(steps)
                let angle = from + sweep * u
                let wobble = 1 + m.wobble * sin(3 * angle + seed) + 0.05 * u
                // Round a short thing as an oval; round a whole line of text as the kit's ring does, with flat sides
                // above and below the words and round ends, so the loop does not cut through the ends of the line.
                // The corners square up as the thing gets wider than it is tall, up to a line eight times as wide.
                let square = 2 + 2 * min(max((box.w / box.h - 2) / 6, 0), 1)
                let across = (cos(angle) < 0 ? -1.0 : 1.0) * pow(abs(cos(angle)), 2 / square), down = (sin(angle) < 0 ? -1.0 : 1.0) * pow(abs(sin(angle)), 2 / square)
                return CGPoint(x: box.x + box.w / 2 + box.w / 2 * m.ringWide * wobble * across, y: box.y + box.h / 2 + (down < 0 ? up : below) * wobble * down)
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
            return rounded(hug(mark.box, tokens: tokens, avoiding: texts), radius: m.boxRadius)
        case .bracket:
            let x = box.x - 6, arm = 9.0
            return [CGPoint(x: x + arm, y: box.y), CGPoint(x: x, y: box.y + 1), CGPoint(x: x - 1, y: box.y + box.h - 1), CGPoint(x: x + arm, y: box.y + box.h)]
        case .tick:
            return tick(beside: mark.box, seed: seed, tokens: tokens)
        case .strike:
            return strike(through: mark.box, seed: seed, tokens: tokens)
        case .tag:
            // A tag is a chip, not ink (`LayoutTag.swift`): the pen draws nothing for it.
            return []
        }
    }

    /// The box that hugs what a box mark marks, after the design kit's highlight: the kit's room round the line
    /// (`mark.boxPadX` across, `mark.boxPadY` up and down) where the page has it. Between close lines its top and
    /// bottom sit in the middle of the gap to the nearest text outside it, pulled in a little where the read box
    /// overlaps its neighbour; and its ends stop half way to a neighbour on the same line, so its ink and its wash
    /// are on no other words.
    static func hug(_ b: Box, tokens: Tokens, avoiding texts: [Box]) -> Box {
        let m = tokens.mark
        let outside = texts.filter { text in
            let middle = text.y + text.h / 2
            return text.x < b.x + b.w && b.x < text.x + text.w && !(middle > b.y && middle < b.y + b.h)
        }
        func room(_ gaps: [Double], most: Double, least: Double) -> Double { min(most, max(least, (gaps.min() ?? 100) / 2 - m.width / 2)) }
        let up = room(outside.filter { $0.y + $0.h / 2 <= b.y }.map { b.y - ($0.y + $0.h) }, most: m.boxPadY, least: -2)
        let down = room(outside.filter { $0.y + $0.h / 2 >= b.y + b.h }.map { $0.y - (b.y + b.h) }, most: m.boxPadY, least: -2)
        let level = texts.filter { $0.y < b.y + b.h && b.y < $0.y + $0.h }
        let left = room(level.filter { $0.x + $0.w <= b.x }.map { b.x - ($0.x + $0.w) }, most: m.boxPadX, least: 1)
        let right = room(level.filter { $0.x >= b.x + b.w }.map { $0.x - (b.x + b.w) }, most: m.boxPadX, least: 1)
        return Box(x: b.x - left, y: b.y - up, w: b.w + left + right, h: b.h + up + down)
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
