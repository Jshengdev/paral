import Foundation

extension Scene {
    /// How a card that came up at `up` stands at `t`: the card itself on the arriving curve, and after it each of
    /// its lines in turn, the first `card.firstMs` after the card and each next one `card.nextMs` later. `gone` is
    /// how far it has gone again. With motion reduced it is whole at once. Any card may ask: the guide's card does.
    func coming(since up: Double, lines: Int, gone: Double = 0, at t: Double) -> CardArrival {
        guard !still else { return CardArrival(card: 1, gone: 0, lines: Array(repeating: 1, count: lines)) }
        let c = tokens.card
        return CardArrival(card: arriving(since: up, at: t), gone: gone, lines: (0..<lines).map { arriving(since: up + ms(c.firstMs + Double($0) * c.nextMs), at: t) })
    }
}
