import Foundation

extension Scene {
    /// The arrow that leads from a mark to what speaks about it, after the design kit's drawn arrow from its ring to
    /// its card. There is one at most, from the newest of paral's marks on the page, and none while the arrow that
    /// says which way to scroll is up. Two things can speak about a mark. The capsule does when the mark's own
    /// sentence is one of its lines: from when that sentence comes up, for as long as the capsule holds that answer's
    /// words, and the arrow is drawn back as the capsule closes. The guide's card does when its words came together
    /// with the mark: for as long as it shows those words. When both do, the arrow leads to the nearer up or down
    /// the display, and is not handed to the other when the first lets go. It is inked once the pen has finished the mark and the cursor has
    /// stepped aside, and it goes with the mark.
    func lead(at t: Double, capsule: CapsulePicture) -> LeadPicture? {
        guard wayUp(at: t) == nil else { return nil }
        let up = marks.last { mark in mark.at <= t && (mark.clearedAt.map { t < $0 } ?? true) && (start(mark).map { $0 <= t } ?? false) }
        guard let mark = up, let began = start(mark) else { return nil }
        let ready = still ? began : began + flight + duration(mark.kind) + ms(tokens.cursor.settleMs)
        let draw = max(ms(tokens.lead.drawMs), 1), key = "\(mark.id)/\(mark.beat)"
        let ask = asks.first { $0.id == mark.id }
        let card = guideOn ? nexts.last { !$0.text.isEmpty && !$0.done && abs($0.at - mark.at) <= Scene.together } : nil
        guard ask?.beats[mark.beat] != nil || card != nil else { return nil }

        var toCard = card != nil
        if ask?.beats[mark.beat] != nil, card != nil {
            // The card sits at the top of the display and the capsule at the bottom, and a way across the page's
            // lines is the one that most often cannot be found. So the nearer is the nearer up or down the display.
            let level = mark.box.y + mark.box.h / 2, pill = Layout.capsule(open: 1, width: width, height: height, tokens: tokens)
            toCard = abs(level - tokens.guide.top) < abs(level - (pill.y + pill.h / 2))
        }
        if toCard, let card {
            // Only while the card still shows the words that came with the mark.
            let from = max(ready, card.at)
            return t >= from && next(at: t)?.at == card.at ? LeadPicture(from: key, to: .guide, drawn: still ? 1 : Motion.land((t - from) / draw)) : nil
        }
        guard let ask, capsule.ask == mark.id, let said = times(ask).first(where: { $0.beat == mark.beat }), t >= max(ready, said.start) else { return nil }
        let inked = still ? 1 : Motion.land((t - max(ready, said.start)) / draw)
        return LeadPicture(from: key, to: .capsule(trail: ask.trail != nil), drawn: capsule.look == .rest ? min(inked, capsule.open) : inked)
    }
}
