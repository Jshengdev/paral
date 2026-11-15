import Foundation

/// One thing at a time. What a look or an answer brings together comes up in a fixed order, each after the one before
/// has arrived: the pointing (the mark, or the way arrow), then the card with its sentence, then the board, and the
/// card's buttons last. Each waits its gap after the one before (`motion.cardAfterMs`, `boardAfterMs`,
/// `buttonsAfterMs`). An answer he asked for keeps its voice's times: its marks and its words come as they are said,
/// and only its board waits for them. With motion reduced everything is there at once.
extension Scene {
    /// When the pointing of an ask that had begun by `by` has arrived: the pen has finished its marks and its way
    /// arrow. A tag is a chip and a spot is on a drawing, so neither points. Nil when nothing of it points.
    func pointed(_ id: String, by: Double) -> Double? {
        let inks = marks.filter { $0.id == id && $0.kind != .tag && !$0.spot && $0.at <= by }.compactMap { mark in start(mark).flatMap { $0 <= by ? $0 + flight + duration(mark.kind) : nil } }
        let arrows = ways.filter { $0.id == id && $0.at <= by }.map { inking($0).to }
        return (inks + arrows).max()
    }

    /// When a card's words have arrived: the card, its first line, then its sentence, each on `arrive`.
    func worded(since: Double) -> Double { still ? since : since + ms(tokens.card.firstMs + tokens.card.nextMs + tokens.motion.arriveMs) }

    /// When the nudge card of an ask sets off: once its line's turn has come and its pointing has arrived and the gap
    /// after it. The same words sent again as the page scrolled are the card that was up, which does not come again.
    func cardSince(_ ask: Ask, _ card: Card, first: BeatTime) -> Double {
        if card.upSince < ask.beganAt { return card.upSince }
        let base = max(card.upSince, first.start)
        guard !still, let pointing = pointed(ask.id, by: base + Scene.together) else { return base }
        return max(base, pointing + ms(tokens.motion.cardAfterMs))
    }

    /// When a board sets off: once whatever of its ask came with it has arrived, and the gap after it. That is the
    /// nudge card with its sentence for a look, and for an answer its marks begun by then and its sentence in the
    /// bubble. The same rows kept from just before do not come again.
    func boardSince(_ board: Board) -> Double {
        guard !still, board.upSince >= board.at else { return board.upSince }
        let by = board.at + Scene.together, gap = ms(tokens.motion.boardAfterMs)
        var after = pointed(board.id, by: by).map { [$0 + gap] } ?? []
        if let ask = asks.first(where: { $0.id == board.id }) {
            if let card = cards[ask.id], !unseen(ask), let first = times(ask).first {
                after.append(worded(since: cardSince(ask, card, first: first)) + gap)
            } else if cards[ask.id] == nil, let said = shown(ask).first(where: { $0.beat >= 0 && $0.start <= by }) {
                after.append(said.start + gap)
            }
        }
        return ([board.upSince] + after).max() ?? board.upSince
    }

    /// When the card's buttons set off: last, once the board of the same look has arrived, or once the card's words
    /// have when it has no board.
    func buttonsSince(_ ask: Ask, cardSince since: Double) -> Double {
        guard !still else { return since }
        let words = worded(since: since)
        guard let board = boards.last(where: { $0.id == ask.id && $0.at <= since }) else { return words + ms(tokens.motion.buttonsAfterMs) }
        return max(words, boardSince(board) + ms(tokens.motion.arriveMs)) + ms(tokens.motion.buttonsAfterMs)
    }
}
