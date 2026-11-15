import Foundation

public struct BeatTime: Equatable {
    public var id: String
    public var beat: Int
    public var start, end: Double
}

extension Scene {
    /// When each sentence of an ask is spoken. A voiced sentence starts when its sound arrives and the one before has
    /// ended; with no voice it is given reading time. A new key press cuts whatever is still being said.
    func times(_ ask: Ask) -> [BeatTime] {
        var out: [BeatTime] = []
        var cursor = -Double.infinity
        for beat in ask.beats.keys.sorted() {
            let said = ask.beats[beat]!
            let start: Double, length: Double
            if let sound = said.soundAt {
                start = max(sound, cursor)
                length = Double(said.bytes) / 48
            } else if let muted = ask.mutedAt {
                start = max(said.sayAt, muted, cursor)
                length = max(tokens.motion.readMsLeast, Double(said.text.split(separator: " ").count) * tokens.motion.readMsAWord)
            } else {
                break
            }
            if let cut = ask.cutAt, start >= cut { break }
            let end = min(start + length, ask.cutAt ?? .infinity)
            out.append(BeatTime(id: ask.id, beat: beat, start: start, end: end))
            cursor = end
        }
        return out
    }

    /// Every spoken sentence so far, for laying the voice onto one sound track.
    public var spoken: [BeatTime] { asks.flatMap(times) }

    /// Every motion time goes through here, so one dial (tempo) speeds up or slows down all of it together.
    func ms(_ value: Double) -> Double { value / max(tokens.motion.tempo, 0.1) }

    /// No movement at all: things appear in place. Set by the Mac's reduce-motion setting, or by the token.
    var still: Bool { reduceMotion || tokens.motion.reduce }

    /// How long the pointer takes to fly to where a stroke starts.
    var flight: Double { still ? 0 : ms(tokens.motion.flightMs) }

    func duration(_ kind: MarkKind) -> Double {
        switch kind {
        case .ring, .box: return ms(tokens.mark.ringMs)
        case .bracket: return ms(tokens.mark.bracketMs)
        case .underline, .wavy: return ms(tokens.mark.lineMs)
        }
    }

    /// A mark sent with its sentence is drawn when that sentence starts. A mark sent ahead of any sentence is drawn at once.
    func start(_ mark: Mark) -> Double? {
        guard mark.withSay, let ask = asks.first(where: { $0.id == mark.id }) else { return mark.at }
        return times(ask).first { $0.beat == mark.beat }?.start
    }

    /// The moment after which nothing on screen changes any more.
    public var end: Double {
        var end = lastAt
        for ask in asks { if let last = times(ask).last { end = max(end, last.end + tokens.motion.lingerMs + ms(tokens.motion.openMs)) } }
        for mark in marks { if let began = start(mark) { end = max(end, began + flight + duration(mark.kind)) } }
        for echo in echoes { end = max(end, echo.at + flight + duration(.ring)) }
        for way in ways { end = max(end, min(way.clearedAt ?? .infinity, inking(way).to + ms(tokens.cursor.settleMs))) }
        for clip in clips { end = max(end, min(clip.clearedAt ?? .infinity, clip.at + ms(tokens.motion.boardMs) + clip.seconds * 1000)) }
        if let closed = closedAt { end = max(end, closed + ms(tokens.motion.openMs)) }
        return end + 200
    }
}
