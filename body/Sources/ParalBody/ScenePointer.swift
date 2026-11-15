import CoreGraphics
import Foundation

extension Scene {
    /// One stroke the cursor makes: when it begins, its kind, and the pen's whole path for it.
    private typealias Stroke = (began: Double, kind: MarkKind, path: [CGPoint])

    /// The strokes on the page at `t`, the newest last. One that has been wiped is not among them, so a clear or a
    /// close takes the cursor with the ink.
    private func strokes(at t: Double) -> [Stroke] {
        func up(_ clearedAt: Double?) -> Bool { clearedAt.map { t < $0 } ?? true }
        var strokes: [Stroke] = []
        for echo in echoes where echo.at <= t && up(echo.clearedAt) {
            strokes.append((echo.at, kind(of: echo), Pen.path(of: ring(for: echo, drawn: 1), tokens: tokens, avoiding: texts, inside: (width, height))))
        }
        for mark in marks where up(mark.clearedAt) {
            guard let began = start(mark), began <= t else { continue }
            let whole = MarkPicture(key: "\(mark.id)/\(mark.beat)", kind: mark.kind, box: mark.box, label: nil, drawn: 1)
            strokes.append((began, mark.kind, Pen.path(of: whole, tokens: tokens, avoiding: texts, inside: (width, height))))
        }
        return strokes.sorted { $0.began < $1.began }
    }

    /// Where the cursor's tip rests once a stroke is drawn: beside it, on none of the page's text.
    private func rest(beside path: [CGPoint]) -> CGPoint {
        let xs = path.map(\.x), ys = path.map(\.y)
        let drawn = Box(x: xs.min() ?? 0, y: ys.min() ?? 0, w: max((xs.max() ?? 0) - (xs.min() ?? 0), 1), h: max((ys.max() ?? 0) - (ys.min() ?? 0), 1))
        return Layout.beside(drawn, cursor: tokens.cursor.size, gap: tokens.cursor.gap, texts: texts, width: width, height: height)
    }

    /// Where the cursor sets off from for something that begins at `began`, and whether it was with an arrow then.
    /// It sets off from wherever it was a moment before, and from the capsule when it was nowhere. The scene does not
    /// know where an arrow is, only that it sits at an edge by the capsule, so from an arrow it also sets off from
    /// the capsule.
    private func origin(before began: Double) -> (from: CGPoint, atAnArrow: Bool) {
        let capsule = Layout.capsule(open: 1, width: width, height: floor, tokens: tokens)
        let home = CGPoint(x: capsule.x + capsule.w / 2, y: capsule.y)
        guard let before = pointer(at: began - 1) else { return (home, false) }
        return before.withWay == nil ? (CGPoint(x: before.x, y: before.y), false) : (home, true)
    }

    /// While paral works its cursor breathes: it swells and comes back, `cursor.workMs` each way and slow at both
    /// ends, from the moment he let the key go. Given in twentieths, so the picture changes only when it would be
    /// seen to.
    func working(at t: Double) -> Double {
        guard let up = holds.last(where: { $0.down <= t })?.up, t >= up else { return 0 }
        let turn = ((t - up) / max(ms(tokens.cursor.workMs), 1)).truncatingRemainder(dividingBy: 2)
        return (tokens.curves.travel(turn < 1 ? turn : 2 - turn) * 20).rounded() / 20
    }

    /// How far the cursor's name tag has popped out since the cursor came: 0 to 1, and a little past on the way.
    private func popped(since came: Double, at t: Double) -> Double { tokens.curves.pop((t - came) / max(ms(tokens.motion.usualMs), 1)) }

    /// Paral's own cursor. It flies in one arc to where the newest stroke starts, rides the pen's tip while the stroke
    /// is drawn, then steps aside to rest just beside the mark, where a ripple spreads from it once to say "here".
    /// When the newest thing on the page is the arrow that says which way to scroll, it goes to the arrow instead,
    /// which is how it leads from one place to the next. It points and never clicks. It stays with its mark or its
    /// arrow for as long as that is on the page, with a key pressed or without one, and it is not shown at all when
    /// motion is reduced.
    func pointer(at t: Double) -> PointerPicture? {
        guard !still else { return nil }
        let newest = strokes(at: t).last
        if let way = wayUp(at: t), way.at >= newest?.began ?? -.infinity {
            let origin = origin(before: way.at)
            // From one arrow to the next it does not fly: the next sits where the one before did.
            let flown = origin.atAnArrow ? 1 : min(max((t - way.at) / max(flight, 1), 0), 1)
            let aside = tokens.curves.travel((t - inking(way).to) / max(ms(tokens.cursor.settleMs), 1))
            let tagged = t < inking(way).to && pointer(at: way.at - 1) == nil
            return PointerPicture(x: origin.from.x, y: origin.from.y, alpha: 1, ripple: nil, withWay: .init(flight: flown, aside: aside), tag: tagged, tagGrown: popped(since: way.at, at: t))
        }
        guard let now = newest, let first = now.path.first, let last = now.path.last else { return nil }
        let inkAt = now.began + flight, inkedAt = inkAt + duration(now.kind)
        // While it flies in and draws, having come from nowhere, it wears its name tag. At rest it wears nothing.
        let tagged = t < inkedAt && pointer(at: now.began - 1) == nil
        if t < inkAt {
            let from = origin(before: now.began).from
            let at = Motion.arc(from: from, to: first, tokens.curves.travel((t - now.began) / flight), lift: tokens.motion.arc)
            return PointerPicture(x: at.x, y: at.y, alpha: 1, ripple: nil, tag: tagged, tagGrown: popped(since: now.began, at: t))
        }
        if t < inkedAt {
            let tip = Pen.reach(now.path, Motion.even((t - inkAt) / duration(now.kind))).tip
            return PointerPicture(x: tip.x, y: tip.y, alpha: 1, ripple: nil, tag: tagged, tagGrown: popped(since: now.began, at: t))
        }
        let settle = ms(tokens.cursor.settleMs), place = rest(beside: now.path)
        let aside = tokens.curves.travel((t - inkedAt) / max(settle, 1))
        let spread = (t - inkedAt - settle) / max(ms(tokens.cursor.rippleMs), 1)
        // The ripple is given in fiftieths, so the picture changes only when it would be seen to.
        let ripple = spread >= 0 && spread < 1 ? (spread * 50).rounded(.down) / 50 : nil
        return PointerPicture(x: last.x + (place.x - last.x) * aside, y: last.y + (place.y - last.y) * aside, alpha: 1, ripple: ripple)
    }
}
