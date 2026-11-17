import Foundation

/// Two lines carry the moment they belong to, which is not the moment they cross. The key-up line is sent after the
/// microphone's grace and names the moment his finger lifted. A dim line names the moment the mind sent it: the mind
/// hears of the release late and keeps sending for a while after it, so the app and the mind both decide which dim
/// line was shown by that stamp against the release, and can never disagree.
extension Seen {
    /// Whether a film carries this line's own stamp over to the record's clock (`Film.swift`).
    var carriesItsMoment: Bool {
        switch self {
        case .keyUp, .thought: return true
        default: return false
        }
    }

    /// When a line from the mind belongs on the scene's clock, live: now, or for a dim line the moment it was sent.
    /// `zero` is the wall clock, in ms, at the scene's start.
    public func belongs(now: Double, zero: Double) -> Double {
        if case .thought(_, let stamp?) = self { return min(now, stamp - zero) }
        return now
    }
}
