import ParalBody

extension App {
    /// A click the overlay took. The cross closes the conversation. The card's offer ("Add to calendar" sends "add it
    /// to my calendar") asks exactly what a tapped cue card asks, with the same picture of the screen; the card goes
    /// on the mind's answer. "Not now" puts the card away, and its words get no card again while the app runs. Neither
    /// tells the mind anything more: the left button's own `click` line goes as it does for any click. A board held by
    /// its strip goes with his pointer (`Scene.place`).
    func pressed(_ hit: Hit) {
        switch hit {
        case .cross: close()
        case .offer(let send): typed(send)
        case .notNow: tell(.notNow)
        // A press on a board's strip alone does nothing; the drag that follows moves the board, and the mind is not told.
        case .strip: break
        case .drag(let id, let dx, let dy, let began): tell(.drag(id: id, dx: dx, dy: dy, began: began))
        }
    }
}
