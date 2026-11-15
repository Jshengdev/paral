import Foundation

extension Scene {
    /// The line the guide's card shows at `t`, if a card is up then.
    func next(at t: Double) -> Next? {
        guard guideOn, let line = nexts.last(where: { $0.shownAt <= t }), !line.text.isEmpty else { return nil }
        return line
    }

    /// The guide's card: what to do next. It is up from its first `next` line and comes up once, the card and then
    /// its two lines (`SceneCard.swift`); a later line changes its words in place. It goes in less time than it
    /// came: when a `next` with no words takes it away, and by itself once the closing line, when every step is
    /// done, has stayed as long as a toast does. It is not ink on the page, so a clear does not take it and it
    /// brings no cross. With the guide switched off (the menu's "Show the guide") there is no card.
    func guide(at t: Double) -> GuidePicture? {
        guard guideOn, let index = nexts.lastIndex(where: { $0.shownAt <= t }) else { return nil }
        var guide = nexts[index], leaves: Double?
        if guide.text.isEmpty {
            // No words take the card away: the line that was up goes.
            guard index > 0, !nexts[index - 1].text.isEmpty else { return nil }
            (leaves, guide) = (guide.shownAt, nexts[index - 1])
        } else if guide.done {
            leaves = guide.shownAt + tokens.toast.stayMs
        }
        if let leaves, t >= leaves + (still ? 0 : ms(tokens.motion.leaveMs)) { return nil }
        let coming = coming(since: guide.upSince, lines: 2, gone: leaves.map { still ? 0 : leaving(since: $0, at: t) } ?? 0, at: t)
        // The closing line is no step, so it carries no number.
        let numbered = !guide.done && guide.of > 0
        return GuidePicture(text: guide.text, n: numbered ? guide.n : nil, of: numbered ? guide.of : nil, appear: min(max(coming.card, 0), 1) * (1 - coming.gone), coming: coming)
    }
}
