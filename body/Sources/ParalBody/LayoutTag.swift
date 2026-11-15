import AppKit

/// Where a tag goes beside its line, and what the cursor rests beside once a line has a tag or a tick.
extension Layout {
    /// How large a tag is: its words in the look's face at `chip.type`, medium, and the room round them. The scene
    /// measures with the same face the painter writes with, so the place it finds fits what is drawn.
    static func tagSize(_ words: String, tokens: Tokens) -> (w: Double, h: Double) {
        let c = tokens.chip, face = Faces.kept(family: tokens.font, optical: tokens.fontOptical).face(c.type, .medium)
        let size = NSAttributedString(string: words, attributes: [.font: face]).size()
        return ((Double(size.width) + 2 * c.padX).rounded(.up), (Double(size.height) + 2 * c.padY).rounded(.up))
    }

    /// Where a tag of `size` sits for `line`: after the line's last word, `chip.gap` clear of it and of any ink of
    /// ours on that line (`ink`), level with the line; where that is not free, above the line's end, clear of its
    /// ink; and nowhere when neither is. Free is inside the display, `chip.clear` from every read line (its own too),
    /// and on none of `taken`. So it is never on the page's words and never on another piece of ours.
    static func tag(size: (w: Double, h: Double), line: Box, ink: [Box], texts: [Box], taken: [Box], width: Double, height: Double, tokens: Tokens) -> Box? {
        let c = tokens.chip
        let reach = ink.reduce(line) { union($0, $1) }
        let after = Box(x: reach.x + reach.w + c.gap, y: line.y + line.h / 2 - size.h / 2, w: size.w, h: size.h)
        // A line that runs off the display ends, for this, at the display's edge.
        let end = min(line.x + line.w, width - c.clear)
        let above = Box(x: end - size.w, y: reach.y - c.above - size.h, w: size.w, h: size.h)
        func free(_ b: Box) -> Bool {
            let around = b.grown(c.clear)
            guard around.x >= 0, around.y >= 0, around.x + around.w <= width, around.y + around.h <= height else { return false }
            return !texts.contains { Scene.touch($0, around) } && !taken.contains { Scene.touch($0, b) }
        }
        return [after, above].first(where: free)
    }

    /// A tag as it is drawn while it pops out: its place scaled about the point of it nearest its line's end, from
    /// `chip.from` of its size at `grown` 0. Gives back that box, the scale and the point.
    static func tag(_ box: Box, of line: Box, grown: Double, tokens: Tokens) -> (box: Box, scale: Double, anchor: CGPoint) {
        let from = tokens.chip.from, scale = from + (1 - from) * grown
        let anchor = CGPoint(x: min(max(line.x + line.w, box.x), box.x + box.w), y: min(max(line.y + line.h / 2, box.y), box.y + box.h))
        let x = anchor.x + (box.x - anchor.x) * scale, y = anchor.y + (box.y - anchor.y) * scale
        return (Box(x: x, y: y, w: box.w * scale, h: box.h * scale), scale, anchor)
    }

    /// The most a tag takes while it pops out, at the furthest the pop curve goes past its place (read off the curve
    /// in hundredths), so the cursor that rests by it is clear of it all the way.
    static func tagLargest(_ box: Box, of line: Box, tokens: Tokens) -> Box {
        let furthest = (0...100).map { tokens.curves.pop(Double($0) / 100) }.max() ?? 1
        return tag(box, of: line, grown: max(furthest, 1), tokens: tokens).box
    }

    /// What the cursor rests beside once a stroke is drawn: the stroke's ink; with the words of its line for a tick,
    /// which is drawn left of them, so the cursor does not rest on them; and with the tags on its line at the most
    /// they take (`tagLargest`), so it rests clear of them and does not cover one.
    static func resting(ink: Box, kind: MarkKind, line: Box?, tags: [Box]) -> Box {
        let inked = kind == .tick ? line.map { union(ink, $0) } ?? ink : ink
        return tags.reduce(inked) { union($0, $1) }
    }

    static func union(_ a: Box, _ b: Box) -> Box {
        let x = min(a.x, b.x), y = min(a.y, b.y)
        return Box(x: x, y: y, w: max(a.x + a.w, b.x + b.w) - x, h: max(a.y + a.h, b.y + b.h) - y)
    }
}
