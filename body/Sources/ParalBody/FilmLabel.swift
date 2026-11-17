import Foundation

extension Film {
    /// The row that says a thing is no longer drawn. A film's record says when a thing's box changes and not when
    /// the thing goes. The label under the pill and the dim line in the bubble are read by when their words stand, so
    /// their going is written too: the box each last had, and `says` null.
    static func gone(_ what: String, _ box: Box, at t: Double) throws -> String {
        let line: [String: Any] = ["at": t.rounded(), "what": what, "box": box.json, "says": NSNull()]
        return String(decoding: try JSONSerialization.data(withJSONObject: line, options: [.sortedKeys]), as: UTF8.self) + "\n"
    }
}
