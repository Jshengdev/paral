import Foundation

extension Scene {
    /// The arrow that leads from a mark to what speaks about it, after the design kit's drawn arrow from its ring to
    /// its card. There is one at most, from the newest of paral's marks on the page, and none while the arrow that
    /// says which way to scroll is up. It is inked once the pen has finished the mark and the cursor has stepped
    /// aside, and it goes with the mark.
    ///
    /// The capsule is what speaks about a mark whenever it carries that mark's words: from when the mark's own
    /// sentence comes up in it, for as long as it holds that answer's words, and the arrow is drawn back as the
    /// capsule closes. The guide's card says what he does next, which is seldom about the marked line; it is led to
    /// only once the capsule is at rest, and only when its words name the very line that is marked ("Open Deadlines"
    /// with the mark on "Deadlines"). In every other case there is no arrow.
    ///
    /// A line said without being asked is on the nudge card, so the card is what speaks about its mark, from when the
    /// line comes up on it, and the arrow is drawn back as the card goes. While any card is up the guide's card gets
    /// no arrow, and once one has gone it waits for that.
    func lead(at t: Double, capsule: CapsulePicture, nudge: NudgePicture?) -> LeadPicture? {
        guard wayUp(at: t) == nil else { return nil }
        // A tag is a chip beside a line's ink, not a mark of the line: the arrow leaves the ink.
        let up = marks.last { mark in mark.kind != .tag && mark.at <= t && (mark.clearedAt.map { t < $0 } ?? true) && (start(mark).map { $0 <= t } ?? false) }
        guard let mark = up, let began = start(mark) else { return nil }
        let ready = still ? began : began + flight + duration(mark.kind) + ms(tokens.cursor.settleMs)
        let key = "\(mark.id)/\(mark.beat)"
        func inked(since from: Double) -> Double { still ? 1 : Motion.even((t - from) / max(arrowMs, 1)) }

        if capsule.ask == mark.id {
            guard let ask = asks.first(where: { $0.id == mark.id }), let said = times(ask).first(where: { $0.beat == mark.beat }), t >= max(ready, said.start) else { return nil }
            let drawn = inked(since: max(ready, said.start))
            return LeadPicture(from: key, to: .capsule(trail: ask.trail != nil), drawn: capsule.look == .rest ? min(drawn, capsule.open) : drawn)
        }
        if let nudge, nudge.id == mark.id {
            guard let ask = asks.first(where: { $0.id == mark.id }), let said = times(ask).first(where: { $0.beat == mark.beat }), t >= max(ready, said.start) else { return nil }
            return LeadPicture(from: key, to: .nudge, drawn: min(inked(since: max(ready, said.start)), 1 - nudge.coming.gone))
        }
        guard nudge == nil, capsule.look == .rest, capsule.open <= 0, let card = next(at: t), !card.done, names(card.text, mark) else { return nil }
        let from = max(ready, card.shownAt, rested(before: t) ?? 0, cardGone(before: t) ?? 0)
        return t >= from ? LeadPicture(from: key, to: .guide, drawn: inked(since: from)) : nil
    }

    /// Whether words name the very line a mark is on: the whole of a read line that the mark is on is among them.
    /// A line of fewer than three letters names nothing.
    private func names(_ words: String, _ mark: Mark) -> Bool {
        let said = words.lowercased()
        return zip(texts, read).contains { box, line in
            let own = line.trimmingCharacters(in: .whitespaces).lowercased()
            return own.count >= 3 && Scene.sameLine(box, mark.box) && said.contains(own)
        }
    }

    /// When the capsule last came to rest, at or before `t`: the latest moment at which it had just shut. Each way
    /// the capsule can come to rest gives a moment to try (an answer's linger, a line said without being asked
    /// leaving, a close), and one counts only if the capsule was open half a closing before it and shut after it.
    /// Nil when none does, as when the capsule has shown nothing yet.
    private func rested(before t: Double) -> Double? {
        let m = tokens.motion, shut = still ? 0 : ms(m.leaveMs)
        var moments = [closedAt, idleAt, idleAt.map { $0 + m.lingerMs }].compactMap { $0 }
        for ask in asks.suffix(4) { if let last = times(ask).last { moments += [last.end + m.unaskedStayMs, last.end + m.lingerMs] } }
        func resting(_ at: Double) -> Bool { let c = self.capsule(at: at); return c.look == .rest && c.open < 0.01 }
        // An answer's capsule takes `leaveMs` to shut; a line said without being asked is gone at once.
        return (moments + moments.map { $0 + shut }).filter { $0 <= t && resting($0 + 1) && !resting($0 - max(shut / 2, 1)) }.max()
    }
}
