import Foundation

extension Scene {
    /// A walk's mark waits for his click on it, and says so as the design kit's highlight does: an echo of its edge
    /// grows out of it and fades, again and again. A walk's mark is one whose board names the step he is on; no
    /// other mark has an echo. The first sets off `mark.echoAfterMs` after the pen has finished the mark, and one
    /// follows another every `mark.echoEveryMs`. Each step's mark is a new mark, sent again by the mind even when the
    /// step is on the same line, so it is drawn again by the pen and its echo starts over from its own ink: the
    /// redraw is what shows that his click took. It stops at his click on the mark, and with the mark: when the
    /// step moves on or the walk ends.
    /// Gives how far through one echo it is, 0 to 1, in fiftieths, so the picture changes only when it would be
    /// seen to; nothing with motion reduced.
    func pulse(of mark: Mark, since began: Double, at t: Double) -> Double? {
        let every = ms(tokens.mark.echoEveryMs)
        guard !still, every > 0 else { return nil }
        guard waits(mark, at: t) else { return nil }
        // It stops at his click on the mark, without waiting for the mind to send the next one.
        if let clicked, clicked.mark == "\(mark.id)/\(mark.beat)", clicked.at >= mark.at, t >= clicked.at { return nil }
        let first = began + flight + duration(mark.kind) + ms(tokens.mark.echoAfterMs)
        guard t >= first else { return nil }
        return ((t - first).truncatingRemainder(dividingBy: every) / every * 50).rounded(.down) / 50
    }
}
