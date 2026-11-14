import Foundation

/// The look, in one file a designer can swap: colour, type, line widths, corners and motion times.
public struct Tokens: Codable {
    public struct Capsule: Codable { public var rest, restClose, width, height, radius, bottom, pad, type, tagType: Double }
    public struct Mark: Codable { public var width, pad, ringMs, lineMs, bracketMs, overshoot, wobble, ringWide, ringTall, labelType, pointer: Double }
    public struct Board: Codable { public var pad, boxPadX, boxPadY, gap, rowGap, type, radius, maxWidth, margin, emptyWidth, emptyHeight: Double }
    public struct Motion: Codable {
        public var tempo, openMs, lingerMs, wordMs, trailFadeMs, boardMs, readMsAWord, readMsLeast, flightMs, arc, bounce: Double
        public var reduce: Bool
    }
    public struct Strings: Codable { public var thinking, listening, failed: String }

    public var ink, paper, accent: String
    public var dim: Double
    public var capsule: Capsule
    public var mark: Mark
    public var board: Board
    public var motion: Motion
    public var strings: Strings

    public static func load(_ path: String) throws -> Tokens {
        try JSONDecoder().decode(Tokens.self, from: Data(contentsOf: URL(fileURLWithPath: path)))
    }
}
