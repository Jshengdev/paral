import AppKit

/// The last way found for the leading arrow and what it was found for. Finding a way tries a few hundred curves
/// against every line of the page, and nothing it depends on moves while the arrow stands, so it is found once.
final class LeadWays {
    struct Asked: Equatable { var mark: Box; var target: Box; var taken: [Box]; var cursor: Box?; var texts: [Box] }
    var asked: Asked?
    var found: [[CGPoint]]?
}

extension Painter {
    /// A place on a box's edge, and the way straight out of the box there.
    private struct Edge { var at: CGPoint; var out: CGPoint }

    /// An arrow shorter than this many heads is not drawn: it would be all head.
    private static let leastHeads = 3.0
    /// The ways a curve may set off from where it begins beside the mark: straight out, as the kit's bow does, or
    /// turned to one side by up to a quarter turn, which is what lets it run down a margin too narrow for a bow.
    /// A quarter turn costs a tenth of its length again, and keeping to its way for longer before it turns a
    /// twentieth: the kit's plain bow wins a short way, and a long way is not swung wide when a straighter one is
    /// clear. Chosen on the recorded walks, not measured.
    private static let turns: [Double] = [0, 25, -25, 50, -50, 75, -75, 90, -90]
    private static let turnCost = 0.1 / 90
    private static let holds: [(held: Double, cost: Double)] = [(1, 0), (1.7, 0.05)]
    /// A way is first tried as a dozen straight pieces, which is enough to refuse most; one that passes is then
    /// drawn in pieces no longer than this many points, so what is checked along them holds for the whole curve.
    private static let coarse = 12, piece = 6.0

    /// The middle of each end of a box, then three places along its bottom and its top. The ends come first, so
    /// of two ways that cost the same the one that leaves a line at its end wins, as the kit's arrow does.
    private func edges(of b: Box) -> [Edge] {
        let ends = [Edge(at: CGPoint(x: b.x + b.w, y: b.y + b.h / 2), out: CGPoint(x: 1, y: 0)), Edge(at: CGPoint(x: b.x, y: b.y + b.h / 2), out: CGPoint(x: -1, y: 0))]
        return ends + [0.5, 0.85, 0.15].flatMap { share in
            [Edge(at: CGPoint(x: b.x + b.w * share, y: b.y + b.h), out: CGPoint(x: 0, y: 1)), Edge(at: CGPoint(x: b.x + b.w * share, y: b.y), out: CGPoint(x: 0, y: -1))]
        }
    }

    /// The way the arrow takes from a mark to what speaks about it, or nothing when there is no good way. It leaves
    /// the mark's edge, beginning on the far side of the cursor where the cursor rests in its way, and stops short
    /// of the target. Its ink never covers the page's words: a way is refused when its ink or its paper edge comes
    /// within `lead.clear` of any read line, the line it leaves among them. It is refused too when it lies on the
    /// mark, the cursor, another piece (`taken`), its target or off the display, and when it is longer than
    /// `lead.longest`. Of the ways left the shortest and the nearest the kit's plain bow wins.
    func way(_ asked: LeadWays.Asked) -> [[CGPoint]]? {
        if ways.asked == asked { return ways.found }
        let gap = tokens.lead.gap, edge = tokens.lead.width / 2 + tokens.way.halo
        let shut = asked.texts.map { $0.grown(edge + tokens.lead.clear) } + [asked.mark.grown(1)] + (asked.cursor.map { [$0.grown(1)] } ?? [])
            + asked.taken.map { $0.grown(tokens.band + edge) } + [asked.target.grown(gap - 1)]
        func on(_ p: CGPoint, _ boxes: [Box]) -> Bool { boxes.contains { p.x > $0.x && p.x < $0.x + $0.w && p.y > $0.y && p.y < $0.y + $0.h } }
        func blocked(_ p: CGPoint) -> Bool { p.x < edge || p.y < edge || p.x > width - edge || p.y > height - edge || on(p, shut) }
        var best: (cost: Double, strokes: [[CGPoint]])?
        for start in edges(of: asked.mark) {
            // It begins straight out from the mark's edge, on the far side of the cursor where the cursor rests there.
            func out(_ far: Double) -> CGPoint { CGPoint(x: start.at.x + start.out.x * far, y: start.at.y + start.out.y * far) }
            let behind = asked.cursor.flatMap { rest in Array(stride(from: 0.0, through: 3 * tokens.cursor.size, by: 2)).last { on(out(gap + $0), [rest.grown(gap / 2)]) } }
            let from = out(gap + (behind.map { $0 + gap } ?? 0))
            guard !blocked(from) else { continue }
            for end in edges(of: asked.target) {
                let to = CGPoint(x: end.at.x + end.out.x * gap, y: end.at.y + end.out.y * gap)
                let far = hypot(to.x - from.x, to.y - from.y)
                guard far >= Painter.leastHeads * tokens.way.head, far <= tokens.lead.longest else { continue }
                for turn in Painter.turns {
                    let angle = turn * Double.pi / 180
                    let leaves = CGPoint(x: start.out.x * cos(angle) - start.out.y * sin(angle), y: start.out.x * sin(angle) + start.out.y * cos(angle))
                    // It sets off toward what it leads to, not away from it.
                    guard leaves.x * (to.x - from.x) + leaves.y * (to.y - from.y) >= 0 else { continue }
                    for hold in Painter.holds {
                        // No way is shorter than the straight one, so one that could not win is not tried.
                        let dear = 1 + abs(turn) * Painter.turnCost + hold.cost
                        guard far * dear < (best?.cost ?? .infinity) else { continue }
                        let rough = Pen.lead(from: from, out: leaves, to: to, held: hold.held, steps: Painter.coarse, tokens: tokens)
                        // It comes in to the target's edge from outside it, and lies on nothing it must keep off.
                        guard rough.arrives.x * end.out.x + rough.arrives.y * end.out.y <= -0.3, !rough.strokes.joined().contains(where: blocked) else { continue }
                        let drawn = Pen.lead(from: from, out: leaves, to: to, held: hold.held, steps: max(36, Int(far / Painter.piece)), tokens: tokens)
                        let shaft = drawn.strokes[0]
                        let long = zip(shaft, shaft.dropFirst()).reduce(0) { $0 + hypot($1.1.x - $1.0.x, $1.1.y - $1.0.y) }
                        guard long <= tokens.lead.longest, long * dear < (best?.cost ?? .infinity), !shaft.contains(where: blocked) else { continue }
                        best = (long * dear, drawn.strokes)
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
        // The mark is its line and the ink round it.
        let ink = Pen.path(of: mark, tokens: tokens, avoiding: picture.avoid, inside: (width, height))
        let b = mark.box, half = tokens.mark.width / 2
        let left = min(b.x, Double(ink.map(\.x).min() ?? 0)) - half, top = min(b.y, Double(ink.map(\.y).min() ?? 0)) - half
        let right = max(b.x + b.w, Double(ink.map(\.x).max() ?? 0)) + half, bottom = max(b.y + b.h, Double(ink.map(\.y).max() ?? 0)) + half
        let c = tokens.cursor
        let cursor = picture.pointer.flatMap { $0.withWay == nil ? Box(x: $0.x - c.edge, y: $0.y - c.edge, w: Layout.cursorWide * c.size + 2 * c.edge, h: c.size + 2 * c.edge) : nil }
        let asked = LeadWays.Asked(mark: Box(x: left, y: top, w: right - left, h: bottom - top), target: target, taken: taken, cursor: cursor, texts: picture.avoid)
        guard let strokes = way(asked) else { return nil }
        let inked = Pen.reach(strokes: strokes, lead.drawn)
        self.ink(inked, wide: tokens.lead.width, ctx)
        let points = Array(inked.joined())
        let xs = points.map(\.x), ys = points.map(\.y)
        let box = Box(x: xs.min() ?? 0, y: ys.min() ?? 0, w: max((xs.max() ?? 0) - (xs.min() ?? 0), 1), h: max((ys.max() ?? 0) - (ys.min() ?? 0), 1))
        return Drawn(what: "lead", id: "\(lead.from)>\(name)", box: box, path: points)
    }
}
