import Foundation

/// What has happened so far. `take` records one event; `picture(at:)` says what is on screen at a moment.
/// It holds no clock and draws nothing, so the windows and the film show the same thing from the same events.
public struct Scene {
    struct Beat { var text: String; var sayAt: Double; var soundAt: Double?; var bytes = 0; var wordStart: [Double] = [] }
    /// `trail` is set only for a line paral said without being asked: the steps it took, shown above the line.
    struct Ask { var id: String; var beganAt: Double; var beats: [Int: Beat] = [:]; var mutedAt: Double?; var cutAt: Double?; var trail: [String]? }
    struct Mark { var id: String; var beat: Int; var kind: MarkKind; var box: Box; var label: String?; var at: Double; var withSay: Bool; var clearedAt: Double? }
    struct Echo { var id: String; var box: Box; var shape: String; var at: Double; var clearedAt: Double? }
    struct Way { var id: String; var down: Bool; var toward: String; var at: Double; var clearedAt: Double? }
    struct Board { var id: String; var rows: [[String]]; var at: Double; var room: Box; var filledAt: Double?; var clearedAt: Double? }
    struct Clip { var id: String; var path: String; var still: String; var seconds: Double; var at: Double; var room: Box; var clearedAt: Double? }
    struct Hold { var down: Double; var up: Double? }

    public let width, height: Double
    public var tokens: Tokens
    public var reduceMotion = false
    var origin = (x: 0.0, y: 0.0)
    var texts: [Box] = []
    var holds: [Hold] = []
    var heard: [(word: String, at: Double)] = []
    var asks: [Ask] = []
    var marks: [Mark] = []
    var boards: [Board] = []
    var echoes: [Echo] = []
    var ways: [Way] = []
    var clips: [Clip] = []
    var trail: [(x: Double, y: Double, at: Double)] = []
    var failed: (detail: String, at: Double)?
    var idleAt: Double?
    var closedAt: Double?
    var lastAt = 0.0

    public init(width: Double, height: Double, tokens: Tokens) {
        self.width = width
        self.height = height
        self.tokens = tokens
    }

    public mutating func take(_ seen: Seen, at: Double) {
        lastAt = max(lastAt, at)
        switch seen {
        case .keyDown:
            for i in asks.indices where asks[i].cutAt == nil { asks[i].cutAt = at }
            for i in echoes.indices where echoes[i].clearedAt == nil { echoes[i].clearedAt = at }
            // A card still empty when he presses again was never filled, and goes.
            for i in boards.indices where boards[i].clearedAt == nil && boards[i].rows.isEmpty { boards[i].clearedAt = at }
            holds.append(Hold(down: at))
            heard = []; trail = []; failed = nil; idleAt = nil; closedAt = nil
        case .keyUp:
            if let last = holds.indices.last, holds[last].up == nil { holds[last].up = at }
        case .trail(let x, let y):
            trail.append((x - origin.x, y - origin.y, at))
        case .screen(let display, let lines):
            origin = (display.x, display.y)
            texts = lines.map { Box(x: $0.box.x / display.scale, y: $0.box.y / display.scale, w: $0.box.w / display.scale, h: $0.box.h / display.scale) }
        case .state(let name, let detail):
            // The first failure since the last press is the cause; one that follows it is its consequence.
            if name == "failed", failed == nil { failed = (detail ?? "", at) }
            if name == "idle" { idleAt = at }
        case .heard(let text, _):
            let words = text.split(separator: " ").map(String.init)
            heard = words.enumerated().map { i, word in i < heard.count && heard[i].word == word ? heard[i] : (word, at) }
        case .say(let id, let beat, let text, _, let trail):
            if !asks.contains(where: { $0.id == id }) { asks.append(Ask(id: id, beganAt: at)) }
            edit(id) {
                $0.beats[beat] = Beat(text: text, sayAt: at)
                if let trail { $0.trail = trail }
            }
        case .voice(let id, let beat, let pcm, _):
            edit(id) { ask in
                guard ask.beats[beat] != nil, !pcm.isEmpty else { return }
                if ask.beats[beat]!.soundAt == nil { ask.beats[beat]!.soundAt = at }
                ask.beats[beat]!.bytes += pcm.count
            }
        case .words(let id, let beat, let start, _):
            edit(id) { $0.beats[beat]?.wordStart += start }
        case .mute(let id):
            edit(id) { $0.mutedAt = at }
        case .mark(let id, let beat, let kind, let box, let label):
            // The first mark of an ask lands the moment it arrives; later ones wait for their sentence.
            let withSay = asks.first { $0.id == id }?.beats[beat] != nil && marks.contains { $0.id == id }
            let here = box.moved(dx: -origin.x, dy: -origin.y)
            for i in marks.indices where marks[i].clearedAt == nil && Scene.sameLine(marks[i].box, here) { marks[i].clearedAt = at }
            // His own loop gives way once paral marks something inside it.
            for i in echoes.indices where echoes[i].clearedAt == nil && Scene.sameLine(echoes[i].box, here) { echoes[i].clearedAt = at }
            // The thing an arrow led to is in view once the same look or answer marks it, so that arrow goes.
            for i in ways.indices where ways[i].clearedAt == nil && ways[i].id == id { ways[i].clearedAt = at }
            marks.append(Mark(id: id, beat: beat, kind: kind, box: box.moved(dx: -origin.x, dy: -origin.y), label: label, at: at, withSay: withSay))
        case .way(let id, let to, let toward):
            // One arrow at a time: a newer one takes the place of the one before. A clear wipes it, as it does a mark.
            for i in ways.indices where ways[i].clearedAt == nil { ways[i].clearedAt = at }
            ways.append(Way(id: id, down: to == "down", toward: toward, at: at))
        case .echo(let id, let box, let shape):
            echoes.append(Echo(id: id, box: box.moved(dx: -origin.x, dy: -origin.y), shape: shape, at: at))
        case .clip(let id, let path, let still, let seconds):
            // The clip and the board share one place, so whichever comes takes it.
            for i in boards.indices where boards[i].clearedAt == nil { boards[i].clearedAt = at }
            for i in clips.indices where clips[i].clearedAt == nil { clips[i].clearedAt = at }
            clips.append(Clip(id: id, path: path, still: still, seconds: seconds, at: at, room: Layout.room(texts: texts, width: width, height: height, tokens: tokens)))
        case .boardClose(let id):
            for i in boards.indices where boards[i].id == id && boards[i].clearedAt == nil && boards[i].rows.isEmpty { boards[i].clearedAt = at }
        case .board(let id, let rows):
            for i in clips.indices where clips[i].clearedAt == nil { clips[i].clearedAt = at }
            // A board for an ask whose empty card is open fills that card; it does not open a second one.
            if let open = boards.lastIndex(where: { $0.id == id && $0.clearedAt == nil && $0.rows.isEmpty }) {
                boards[open].rows = rows
                boards[open].filledAt = at
                break
            }
            boards.append(Board(id: id, rows: rows, at: at, room: Layout.room(texts: texts, width: width, height: height, tokens: tokens)))
        case .clear:
            wipe(at)
        case .close:
            wipe(at)
            for i in echoes.indices where echoes[i].clearedAt == nil { echoes[i].clearedAt = at }
            closedAt = at
            for i in asks.indices where asks[i].cutAt == nil { asks[i].cutAt = at }
            if let last = holds.indices.last, holds[last].up == nil { holds[last].up = at }
        case .ready:
            // The mind is linked. A failure from before the first press (the mind was not running) no longer stands.
            if holds.isEmpty { failed = nil }
        case .other, .open:
            break
        }
    }

    /// Two boxes are on the same line when they overlap by more than half of the smaller one.
    static func sameLine(_ a: Box, _ b: Box) -> Bool {
        let w = min(a.x + a.w, b.x + b.w) - max(a.x, b.x), h = min(a.y + a.h, b.y + b.h) - max(a.y, b.y)
        return w > 0 && h > 0 && w * h > 0.5 * min(a.w * a.h, b.w * b.h)
    }

    private mutating func edit(_ id: String, _ change: (inout Ask) -> Void) {
        if let i = asks.firstIndex(where: { $0.id == id }) { change(&asks[i]) }
    }

    private mutating func wipe(_ at: Double) {
        for i in marks.indices where marks[i].clearedAt == nil { marks[i].clearedAt = at }
        for i in ways.indices where ways[i].clearedAt == nil { ways[i].clearedAt = at }
        for i in boards.indices where boards[i].clearedAt == nil { boards[i].clearedAt = at }
        for i in clips.indices where clips[i].clearedAt == nil { clips[i].clearedAt = at }
    }
}
