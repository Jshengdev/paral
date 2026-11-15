import Foundation

extension Scene {
    /// A walk's mark waits for his click on it, and says so as the design kit's highlight does: an echo of its edge
    /// grows out of it and fades, again and again. A walk's mark is one whose board names the step he is on; no
    /// other mark has an echo. The first sets off `mark.echoAfterMs` after the pen has finished the mark, and one
    /// follows another every `mark.echoEveryMs`. Each step's mark is a new mark, sent again by the mind even when the
    /// step is on the same line, so it is drawn again by the pen and its echo starts over from its own ink: the
    /// redraw is what shows that his click took. It stops with the mark: when the step moves on or the walk ends.
    /// Gives how far through one echo it is, 0 to 1, in fiftieths, so the picture changes only when it would be
    /// seen to; nothing with motion reduced.
    func pulse(of mark: Mark, since began: Double, at t: Double) -> Double? {
        let every = ms(tokens.mark.echoEveryMs)
        guard !still, every > 0 else { return nil }
        guard boards.contains(where: { $0.id == mark.id && $0.now != nil && $0.at <= t && ($0.clearedAt.map { t < $0 } ?? true) }) else { return nil }
        let first = began + flight + duration(mark.kind) + ms(tokens.mark.echoAfterMs)
        guard t >= first else { return nil }
        return ((t - first).truncatingRemainder(dividingBy: every) / every * 50).rounded(.down) / 50
    }
}
