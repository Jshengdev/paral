import Foundation

extension Scene {
    /// Whether the page has moved away from under what paral placed on it, as the app's watcher last saw (`Watch`).
    /// The marks and their tags would then be on the wrong words, so they are not drawn, the cursor does not rest by
    /// them and no arrow leaves them, until the page stands as it did or the mind places them again. The scroll arrow
    /// and the cards are not of the page's place and stay.
    func stale(at t: Double) -> Bool { staleAt.map { t >= $0 } ?? false }
}
