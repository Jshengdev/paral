import AppKit

/// The last way found for the leading arrow and what it was found for. Finding a way tries a few hundred curves
/// against every line of the page, and nothing it depends on moves while the arrow stands, so it is found once.
final class LeadWays {
    struct Asked: Equatable { var mark: Box; var own: [Box]; var target: Box; var taken: [Box]; var cursor: Box?; var texts: [Box] }
    var asked: Asked?
    var found: [[CGPoint]]?
}

extension Painter {
    /// A place on a box's edge, and the way straight out of the box there.
    private struct Edge { var at: CGPoint; var out: CGPoint }

    /// How much a share of its length on the page's words costs a way, against its length: a way with a twentieth
    /// of itself on words loses to a clean one up to twice as long.
    private static let wordsCost = 20.0
    /// An arrow shorter than this many heads is not drawn: it would be all head.
    private static let leastHeads = 3.0
    /// The ways a curve may leave an edge, each with what it costs against the kit's own bow, which leaves straight
    /// out: leaning to one side by 25 or 50 degrees, or keeping to its way for longer before it turns. A plain bow
    /// wins unless it is in the way of something. All chosen on the recorded walks, not measured.
    private static let leans: [(turn: Double, cost: Double)] = [(0, 0), (25, 0.15), (-25, 0.15), (50, 0.3), (-50, 0.3)]
    private static let holds: [(held: Double, cost: Double)] = [(1, 0), (1.7, 0.1)]

    /// The middle of each end of a box, then three places along its bottom and its top. The ends come first, so
    /// of two ways that cost the same the one that leaves a line at its end wins, as the kit's arrow does.
    private func edges(of b: Box) -> [Edge] {
        let ends = [Edge(at: CGPoint(x: b.x + b.w, y: b.y + b.h / 2), out: CGPoint(x: 1, y: 0)), Edge(at: CGPoint(x: b.x, y: b.y + b.h / 2), out: CGPoint(x: -1, y: 0))]
        return ends + [0.5, 0.85, 0.15].flatMap { share in
            [Edge(at: CGPoint(x: b.x + b.w * share, y: b.y + b.h), out: CGPoint(x: 0, y: 1)), Edge(at: CGPoint(x: b.x + b.w * share, y: b.y), out: CGPoint(x: 0, y: -1))]
        }
    }

    /// The way the arrow takes from a mark to what speaks about it, or nothing when there is no good way. It leaves
    /// the mark's edge, past the cursor where the cursor rests in its way, and stops short of the target. A way is
    /// refused when it lies on the words of the line it leaves (`own`), on another piece (`taken`), on its target
    /// or off the display, when more than `lead.overText` of it lies on the page's other words, and when it is
    /// longer than `lead.longest`. Of the ways left, the one that lies on the fewest words, is shortest and is
    /// nearest the kit's plain bow wins.
    func way(_ asked: LeadWays.Asked) -> [[CGPoint]]? {
        if ways.asked == asked { return ways.found }
        let gap = tokens.lead.gap, half = tokens.mark.width / 2
        let shut = asked.own.map { $0.grown(half + 1) } + asked.taken.map { $0.grown(tokens.band + half) } + [asked.target.grown(gap - 1)]
        let words = asked.texts.map { $0.grown(half) } + (asked.cursor.map { [$0] } ?? [])
        func on(_ p: CGPoint, _ boxes: [Box]) -> Bool { boxes.contains { p.x > $0.x && p.x < $0.x + $0.w && p.y > $0.y && p.y < $0.y + $0.h } }
        func off(_ p: CGPoint) -> Bool { p.x < half || p.y < half || p.x > width - half || p.y > height - half }
        var best: (cost: Double, strokes: [[CGPoint]])?
        for start in edges(of: asked.mark) {
            for lean in Painter.leans {
                let turn = lean.turn * Double.pi / 180
                let out = CGPoint(x: start.out.x * cos(turn) - start.out.y * sin(turn), y: start.out.x * sin(turn) + start.out.y * cos(turn))
                // Where the cursor rests on this way out of the mark, the arrow begins on the far side of it.
                func along(_ far: Double) -> CGPoint { CGPoint(x: start.at.x + out.x * far, y: start.at.y + out.y * far) }
                let behind = asked.cursor.flatMap { rest in Array(stride(from: 0.0, through: 3 * tokens.cursor.size, by: 2)).last { on(along(gap + $0), [rest.grown(gap / 2)]) } }
                let from = along(gap + (behind.map { $0 + gap } ?? 0))
                for end in edges(of: asked.target) {
                    let to = CGPoint(x: end.at.x + end.out.x * gap, y: end.at.y + end.out.y * gap)
                    // Long enough to be an arrow, and it leaves toward what it leads to.
                    guard hypot(to.x - from.x, to.y - from.y) >= Painter.leastHeads * tokens.way.head, out.x * (to.x - from.x) + out.y * (to.y - from.y) >= 0 else { continue }
                    for hold in Painter.holds {
                        let drawn = Pen.lead(from: from, out: out, to: to, held: hold.held, tokens: tokens)
                        // It comes in to the target's edge from outside it, and lies on nothing it must keep off.
                        guard drawn.arrives.x * end.out.x + drawn.arrives.y * end.out.y <= -0.3 else { continue }
                        let points = Array(drawn.strokes.joined())
                        guard !points.contains(where: { off($0) || on($0, shut) }) else { continue }
                        let share = Double(points.filter { on($0, words) }.count) / Double(points.count)
                        guard share <= tokens.lead.overText else { continue }
                        let long = zip(drawn.strokes[0], drawn.strokes[0].dropFirst()).reduce(0) { $0 + hypot($1.1.x - $1.0.x, $1.1.y - $1.0.y) }
                        guard long <= tokens.lead.longest else { continue }
                        let cost = long * (1 + Painter.wordsCost * share) * (1 + lean.cost + hold.cost)
                        if cost < (best?.cost ?? .infinity) { best = (cost, drawn.strokes) }
                    }
                }
            }
        }
        (ways.asked, ways.found) = (asked, best?.strokes)
        return best?.strokes
    }

    /// Draws the arrow that leads from a mark to what speaks about it, as far as the pen has got, and gives back
    /// what was inked. `placed` is everything drawn so far: the arrow keeps off all of it, so it comes after.
    func lead(_ picture: Picture, placed: [Drawn], _ ctx: CGContext) -> Drawn? {
        guard let lead = picture.lead, lead.drawn > 0, let mark = picture.marks.first(where: { $0.key == lead.from }) else { return nil }
        // The capsule at its full size, whatever it is doing at this moment, so the arrow's way does not move with it.
        func pill(_ trail: Bool) -> Box { Layout.capsule(open: 1, taller: trail ? Layout.band(tokens) : 0, width: width, height: height, tokens: tokens) }
        let card = placed.first { $0.what == "guide" }?.box
        var taken = placed.filter { ["board", "clip", "way", "toast"].contains($0.what) }.map(\.box)
        let target: Box, name: String
        switch lead.to {
        case .guide:
            guard let card else { return nil }
            (target, name) = (card, "guide")
            taken.append(pill(true))
        case .capsule(let trail):
            (target, name) = (pill(trail), "capsule")
            if let card { taken.append(card) }
        }
        // The mark is its line and the ink round it; the words of its line are every read line level with it.
        let ink = Pen.path(of: mark, tokens: tokens, avoiding: picture.avoid, inside: (width, height))
        let b = mark.box, half = tokens.mark.width / 2
        let left = min(b.x, Double(ink.map(\.x).min() ?? 0)) - half, top = min(b.y, Double(ink.map(\.y).min() ?? 0)) - half
        let right = max(b.x + b.w, Double(ink.map(\.x).max() ?? 0)) + half, bottom = max(b.y + b.h, Double(ink.map(\.y).max() ?? 0)) + half
        let whole = Box(x: left, y: top, w: right - left, h: bottom - top)
        func level(_ text: Box) -> Bool { text.y + text.h / 2 > b.y && text.y + text.h / 2 < b.y + b.h }
        let c = tokens.cursor
        let cursor = picture.pointer.flatMap { $0.withWay == nil ? Box(x: $0.x - c.edge, y: $0.y - c.edge, w: Layout.cursorWide * c.size + 2 * c.edge, h: c.size + 2 * c.edge) : nil }
        let asked = LeadWays.Asked(mark: whole, own: [whole] + picture.avoid.filter(level), target: target, taken: taken, cursor: cursor, texts: picture.avoid.filter { !level($0) })
        guard let strokes = way(asked) else { return nil }
        let inked = Pen.reach(strokes: strokes, lead.drawn)
        self.ink(inked, ctx)
        let points = Array(inked.joined())
        let xs = points.map(\.x), ys = points.map(\.y)
        let box = Box(x: xs.min() ?? 0, y: ys.min() ?? 0, w: max((xs.max() ?? 0) - (xs.min() ?? 0), 1), h: max((ys.max() ?? 0) - (ys.min() ?? 0), 1))
        return Drawn(what: "lead", id: "\(lead.from)>\(name)", box: box, path: points)
    }
}
