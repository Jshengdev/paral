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

    /// How long a line stands before another may take its place: a time for each of its words, and never less than
    /// the least reading time. Shorter than the time a line is given to be read, and than it takes to say aloud.
    func stand(_ text: String) -> Double {
        max(tokens.motion.readMsLeast, Double(text.split(separator: " ").count) * tokens.motion.standMsAWord)
    }

    /// When each sentence's words come up in the capsule: with its voice, and not before the sentence before it has
    /// stood its time. So the words run behind the voice by no more than that time, and no sentence is passed over.
    func shown(_ ask: Ask) -> [BeatTime] {
        var out: [BeatTime] = []
        for var time in times(ask) {
            if let before = out.last, let said = ask.beats[before.beat] { time.start = max(time.start, before.start + stand(said.text)) }
            out.append(time)
        }
        return out
    }

    /// The line the capsule holds at `t` and since when, if it holds one.
    func standing(at t: Double) -> (text: String, since: Double)? {
        let capsule = capsule(at: t)
        guard capsule.look == .speaking, let ask = asks.first(where: { $0.id == capsule.ask }),
              let up = shown(ask).last(where: { $0.start <= t }), let said = ask.beats[up.beat] else { return nil }
        return (said.text, up.start)
    }

    /// When a line said without being asked, arriving at `at`, gets its turn in the capsule: once the line the
    /// capsule holds has stood its time, and after every such line that is still waiting for its own turn. A line
    /// whose words got no card (he had answered them) holds no line back.
    func turn(after at: Double) -> Double {
        var waits = [standing(at: at)].compactMap { $0 }
        if let last = asks.last(where: { cards[$0.id] != nil && !unseen($0) }), let text = last.beats.keys.max().flatMap({ last.beats[$0]?.text }) {
            waits.append((text, shown(last).last?.start ?? last.beganAt))
        }
        return max(at, waits.map { $0.since + stand($0.text) }.max() ?? at)
    }

    /// Every spoken sentence so far, for laying the voice onto one sound track.
    public var spoken: [BeatTime] { asks.flatMap(times) }

    /// The display's height less what the Dock takes of its foot: what is laid out at the bottom is laid out above this.
    var floor: Double { height - bottomInset }

    /// Every motion time goes through here, so one dial (tempo) speeds up or slows down all of it together.
    func ms(_ value: Double) -> Double { value / max(tokens.motion.tempo, 0.1) }

    /// No movement at all: things appear in place. Set by the Mac's reduce-motion setting, or by the token.
    var still: Bool { reduceMotion || tokens.motion.reduce }

    /// How long the pointer takes to fly to where a stroke starts.
    var flight: Double { still ? 0 : ms(tokens.motion.flightMs) }

    /// How far a thing that began to arrive at `since` has come by `t`, and how far one that began to leave has
    /// gone: each on its own curve, and leaving in less time than arriving.
    func arriving(since: Double, at t: Double) -> Double { tokens.curves.arrive((t - since) / max(ms(tokens.motion.arriveMs), 1)) }
    func leaving(since: Double, at t: Double) -> Double { tokens.curves.leave((t - since) / max(ms(tokens.motion.leaveMs), 1)) }

    /// How long the pen takes over a drawn arrow: its shaft, then its head.
    var arrowMs: Double { ms(tokens.mark.shaftMs + tokens.mark.headMs) }

    /// How long the pen takes over a mark; for a tag, which is not ink, how long it takes to pop out.
    func duration(_ kind: MarkKind) -> Double {
        switch kind {
        case .ring, .box: return ms(tokens.mark.ringMs)
        case .bracket: return ms(tokens.mark.bracketMs)
        case .underline, .wavy: return ms(tokens.mark.lineMs)
        case .tick: return ms(tokens.mark.tickMs)
        case .strike: return ms(tokens.mark.strikeMs)
        case .tag: return ms(tokens.chip.ms)
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
        for ask in asks { if let last = times(ask).last { end = max(end, last.end + tokens.motion.lingerMs + ms(tokens.motion.leaveMs)) } }
        for mark in marks { if let began = start(mark) { end = max(end, began + flight + duration(mark.kind)) } }
        for tag in marks where tag.kind == .tag { if let came = arrives(tag) { end = max(end, came + duration(.tag)) } }
        for echo in echoes { end = max(end, echo.at + flight + duration(.ring)) }
        for way in ways { end = max(end, min(way.clearedAt ?? .infinity, inking(way).to + ms(tokens.cursor.settleMs))) }
        for clip in clips { end = max(end, min(clip.clearedAt ?? .infinity, clip.at + ms(tokens.motion.arriveMs) + clip.seconds * 1000)) }
        if let opened { end = max(end, opened.at + ms(tokens.motion.arriveMs) + tokens.toast.stayMs + ms(tokens.motion.leaveMs)) }
        if let gone = cardGone(before: .infinity) { end = max(end, gone) }
        if let guide = nexts.last { end = max(end, guide.shownAt + (guide.done ? tokens.toast.stayMs + ms(tokens.motion.leaveMs) : 0)) }
        if let closed = closedAt { end = max(end, closed + ms(tokens.motion.leaveMs)) }
        return end + 200
    }
}
