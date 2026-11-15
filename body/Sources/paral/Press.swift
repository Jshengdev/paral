import ParalBody

extension App {
    /// A click the overlay took. The cross closes the conversation. "Add to calendar" asks exactly what a tapped cue
    /// card asks, with the same picture of the screen; the mind then opens the date and the card goes on its `open`
    /// line. "Not now" puts the card away, and its words get no card again while the app runs. Neither tells the mind
    /// anything more: the left button's own `click` line goes as it does for any click.
    func pressed(_ hit: Hit) {
        switch hit {
        case .cross: close()
        case .button(.add): typed(Nudge.asks)
        case .button(.notNow): tell(.notNow)
        }
    }
}
