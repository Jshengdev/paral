import Foundation

extension Scene {
    /// The line the guide's card shows at `t`, if a card is up then.
    func next(at t: Double) -> Next? {
        guard guideOn, let line = nexts.last(where: { $0.shownAt <= t }), !line.text.isEmpty else { return nil }
        return line
    }

    /// The guide's card: what to do next. It is up from its first `next` line and fades in once; a later line changes
    /// its words in place. The closing line, when every step is done, stays as long as a toast does and then the
    /// card goes by itself. It is not ink on the page, so a clear does not take it and it brings no cross. With the
    /// guide switched off (the menu's "Show the guide") there is no card.
    func guide(at t: Double) -> GuidePicture? {
        guard let guide = next(at: t) else { return nil }
        let leaves = guide.shownAt + tokens.toast.stayMs
        if guide.done, t >= leaves + ms(tokens.motion.leaveMs) { return nil }
        let going = guide.done ? 1 - leaving(since: leaves, at: t) : 1
        let appear = still ? 1 : min(arriving(since: guide.upSince, at: t), going)
        // The closing line is no step, so it carries no number.
        let numbered = !guide.done && guide.of > 0
        return GuidePicture(text: guide.text, n: numbered ? guide.n : nil, of: numbered ? guide.of : nil, appear: appear)
    }
}
