import Foundation

/// The steps of a flow, handed out one at a time. A flow with "live": true is walked a step at a time by whoever writes
/// its file: when the steps so far are played it waits for another to be added, and "end": true closes it. Any other
/// flow ends with its last step.
struct FlowSteps {
    /// The flow file, read again for each step of a live flow.
    let path: URL
    let live: Bool
    /// The steps the file held when the flow began.
    let asks: [[String: Any]]
    private var taken = 0
    /// How often a live flow looks at its file for a new step: short beside the seconds a step takes to play.
    private static let everyMs: UInt64 = 250

    init(path: URL, live: Bool, asks: [[String: Any]]) {
        self.path = path
        self.live = live
        self.asks = asks
    }

    /// The next step, or nil when the flow is over.
    mutating func next() async -> [String: Any]? {
        while true {
            // A file caught half written reads as nothing new, and is read again.
            let now = live ? (try? JSONSerialization.jsonObject(with: Data(contentsOf: path))) as? [String: Any] : nil
            let steps = now?["asks"] as? [[String: Any]] ?? asks
            if taken < steps.count {
                taken += 1
                return steps[taken - 1]
            }
            if !live || now?["end"] as? Bool == true { return nil }
            try? await Task.sleep(nanoseconds: Self.everyMs * 1_000_000)
        }
    }
}
