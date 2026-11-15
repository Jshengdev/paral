import Foundation

extension Scene {
    /// A walk's mark waits for his click on it, and says so by breathing. A walk's mark is one whose board names
    /// the step he is on; no other mark breathes. The first breath comes when the pen has finished the mark, the
    /// cursor has stepped aside and its ripple has spread, so that he sees it before he clicks; after that one
    /// follows each rest, the way arrow's own, so it is alive without moving all the time he reads. Each step's
    /// mark is a new mark, sent again by the mind even when the step is on the same line, so it is drawn again and
    /// takes up its breath from its own ink. It stops with the mark: when the step moves on or the walk ends. Given
    /// in twentieths, so the picture changes only when the breath would be seen to; and nothing breathes with
    /// motion reduced.
    func breath(of mark: Mark, since began: Double, at t: Double) -> Double {
        let every = ms(tokens.way.nodEveryMs), length = ms(tokens.mark.breathMs)
        guard !still, every > 0, length > 0 else { return 0 }
        guard boards.contains(where: { $0.id == mark.id && $0.now != nil && $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }) else { return 0 }
        let first = began + flight + duration(mark.kind) + ms(tokens.cursor.settleMs) + ms(tokens.cursor.rippleMs)
        guard t >= first else { return 0 }
        let u = (t - first).truncatingRemainder(dividingBy: every) / length
        guard u < 1 else { return 0 }
        // In and out alike, slow at both ends: a breath, where the arrow's nod is a quick dip and a spring back.
        return (Motion.ease(1 - abs(2 * u - 1)) * 20).rounded() / 20
    }
}
