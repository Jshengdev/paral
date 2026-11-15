import Foundation

/// One scenario of the demo's bank: its name, the page it is run on when it has one (an address the menu offers to
/// open), and its lines in the order he would say them. The bank comes from the mind's ready line (`cueCards`); the
/// body keeps no list of its own.
public struct Cue: Equatable {
    public var name: String
    public var page: String?
    public var lines: [String]
    public init(name: String, page: String? = nil, lines: [String]) { self.name = name; self.page = page; self.lines = lines }

    /// The groups of a ready line's `cues`, as they crossed the seam. A group with no name or no lines list is left out.
    public static func read(_ any: Any?) -> [Cue] {
        (any as? [[String: Any]] ?? []).compactMap { cue in
            guard let name = cue["name"] as? String, let lines = cue["lines"] as? [String] else { return nil }
            return Cue(name: name, page: cue["page"] as? String, lines: lines)
        }
    }
}
