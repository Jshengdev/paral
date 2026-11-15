import Foundation

/// The words the nudge card's "Add to calendar" asks, exactly as a cue card tapped in the menu asks them. They must
/// be among the mind's `keepAsks`, which keep the date paral last showed him.
public enum Nudge { public static let asks = "add it to my calendar" }

extension Scene {
    /// The nudge card of one line said without being asked. `upSince` is when its card came up: earlier than the
    /// line's own turn when the same words were on the card just before (the page scrolled and the look sent them
    /// again). `answered` is the button he pressed and when; `goneAt` is when it began to go, once it has.
    struct Card { var keep: Bool; var upSince: Double; var answered: (button: NudgeButton, at: Double)?; var goneAt: Double? }

    /// The newest line said without being asked whose turn has come by `t`: the one the card is about, if any. A
    /// newer one takes the card's place when its turn comes.
    func unasked(at t: Double) -> Ask? { asks.last { $0.trail != nil && $0.beganAt <= t } }

    /// The words of an ask's line.
    private func words(_ ask: Ask) -> String { ask.beats.keys.max().flatMap { ask.beats[$0]?.text } ?? "" }

    /// Whether a line's words get no card: he had answered the same words before its card would have come up.
    func unseen(_ ask: Ask) -> Bool {
        guard let card = cards[ask.id] else { return false }
        let text = words(ask)
        return answered.contains { $0.text == text && $0.at < card.upSince }
    }

    /// Whether an ask's card is up at `t` and not going.
    private func shows(_ ask: Ask, at t: Double) -> Bool { nudge(at: t).map { $0.id == ask.id && $0.coming.gone == 0 } ?? false }

    /// The card of a line that gets its turn at `comes`: a new one, or the one already up when it holds the same
    /// words. That is the same card: it does not come up a second time and keeps what he did with it.
    func card(_ text: String, keep: Bool, comes: Double) -> Card {
        if let up = unasked(at: comes), let card = cards[up.id], words(up) == text, shows(up, at: comes) {
            return Card(keep: keep, upSince: card.upSince, answered: card.answered)
        }
        return Card(keep: keep, upSince: comes)
    }

    /// He pressed a button of the card that is up, or tapped its ask in the menu. "Not now" sends it away at once;
    /// "Add to calendar" keeps it up until the date is opened. Either way its words get no card again.
    mutating func answer(_ button: NudgeButton, _ at: Double) {
        guard let ask = unasked(at: at), let card = cards[ask.id], card.keep, card.answered == nil, shows(ask, at: at) else { return }
        cards[ask.id]?.answered = (button, at)
        if button == .notNow { cards[ask.id]?.goneAt = at }
        answered.append((words(ask), at))
    }

    /// The card that is up goes: he pressed the key or closed. A card that waits for its date stays through the ask
    /// its own button made (which begins at the press), and goes when that ask is over (`onlyAnswered`).
    mutating func goes(_ at: Double, onlyAnswered: Bool = false) {
        guard let ask = unasked(at: at), let card = cards[ask.id], shows(ask, at: at) else { return }
        if let answer = card.answered, answer.at >= at { return }
        if onlyAnswered, card.answered == nil { return }
        cards[ask.id]?.goneAt = at
    }

    /// A date was opened in his calendar: the date paral last showed him, which is the newest card that offered it.
    /// That card goes, and its words get no card again, however the date was asked for.
    mutating func kept(_ at: Double) {
        guard let ask = asks.last(where: { $0.trail != nil && $0.beganAt <= at && cards[$0.id]?.keep == true }) else { return }
        if shows(ask, at: at) { cards[ask.id]?.goneAt = at }
        answered.append((words(ask), at))
    }

    /// When an ask's card begins to go, or nil while it stays. With buttons it stays until it is sent away; with
    /// none, for its reading time and the stay after it, as the capsule kept such a line before.
    func ends(_ ask: Ask) -> Double? {
        guard let card = cards[ask.id] else { return nil }
        if let gone = card.goneAt { return gone }
        return card.keep ? nil : times(ask).last.map { $0.end + tokens.motion.unaskedStayMs }
    }

    /// The nudge card at `t`: the newest line said without being asked, once its turn has come, beside the mark the
    /// same look made. It comes up as any card does (`Scene.coming`), its rows one after another, and goes on `leave`
    /// in `nudge.leaveMs`, less time; with motion reduced it is there or not, with no rise. Words he has answered before it came up get no card.
    func nudge(at t: Double) -> NudgePicture? {
        guard let ask = unasked(at: t), let card = cards[ask.id], let now = times(ask).first, now.start <= t, let said = ask.beats[now.beat] else { return nil }
        let text = words(ask), n = tokens.nudge
        guard !unseen(ask) else { return nil }
        let end = ends(ask)
        if let end, t >= end + (still ? 0 : ms(n.leaveMs)) { return nil }
        let gone = end.map { t < $0 ? 0 : tokens.curves.leave((t - $0) / max(ms(n.leaveMs), 1)) } ?? 0
        // A line with a voice comes up when its sound begins, which may be after its turn; the same words sent again
        // are the card that was already up. It comes up as any card does, its three lines after it.
        let since = card.upSince < ask.beganAt ? card.upSince : max(card.upSince, now.start)
        let arrival = coming(since: since, lines: 3, gone: gone, at: t)
        // Its words fill in as they are said, as an answer's do in the capsule; shown and not spoken, they are whole.
        let whole = said.text.split(separator: " ").map { Word(text: String($0), bright: 1) }
        let spoken = said.soundAt != nil && t < now.end ? words(of: said, from: now, at: t) : whole
        // The steps light one after another, as they did in the capsule.
        let trail = (ask.trail ?? []).enumerated().map { index, step in Word(text: step, bright: still || t - ask.beganAt >= Double(index) * ms(tokens.motion.trailStepMs) ? 1 : tokens.dim) }
        let beside = marks.last { $0.id == ask.id && $0.at <= t }?.box
        return NudgePicture(id: ask.id, text: text, words: spoken, trail: trail, buttons: card.keep, beside: beside, coming: arrival, answered: card.answered?.button)
    }

    /// When the newest card to have gone was gone, at or before `t`, if one has. A card whose place a newer line had
    /// taken before it ended was not on screen then, and does not count.
    func cardGone(before t: Double) -> Double? {
        let leave = still ? 0 : ms(tokens.nudge.leaveMs)
        return asks.compactMap { ask in ends(ask).flatMap { end in unasked(at: end)?.id == ask.id ? end + leave : nil } }.filter { $0 <= t }.max()
    }
}
