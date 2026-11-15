import Foundation

/// What has happened so far. `take` records one event; `picture(at:)` says what is on screen at a moment.
/// It holds no clock and draws nothing, so the windows and the film show the same thing from the same events.
public struct Scene {
    /// `levels` is how loud each chunk of its voice is, from the byte of the beat's sound where that chunk begins.
    struct Beat { var text: String; var sayAt: Double; var soundAt: Double?; var bytes = 0; var wordStart: [Double] = []; var levels: [(from: Int, level: Double)] = [] }
    /// `trail` is set only for a line paral said without being asked: the steps it took, shown above the line.
    /// `beganAt` is when its first line came; for a line said without being asked, when that line gets its turn in
    /// the capsule, which is when it came or later.
    struct Ask { var id: String; var beganAt: Double; var beats: [Int: Beat] = [:]; var mutedAt: Double?; var cutAt: Double?; var trail: [String]? }
    struct Mark { var id: String; var beat: Int; var kind: MarkKind; var box: Box; var label: String?; var tone: Tone? = nil; var spot = false; var at: Double; var withSay: Bool; var clearedAt: Double? }
    struct Echo { var id: String; var box: Box; var shape: String; var at: Double; var clearedAt: Double? }
    struct Way { var id: String; var down: Bool; var toward: String; var at: Double; var clearedAt: Double? }
    /// `upSince` is when its card first came up, which is before `at` for a board that takes the place of the same rows.
    struct Board { var id: String; var rows: [[String]]; var now: Int?; var at: Double; var upSince: Double; var room: Box; var filledAt: Double?; var clearedAt: Double? }
    struct Clip { var id: String; var path: String; var still: String; var seconds: Double; var at: Double; var room: Box; var clearedAt: Double? }
    struct Hold { var down: Double; var up: Double? }

    public let width, height: Double
    /// How much of the display's foot is taken by the Dock, in points: what sits at the bottom is placed above it. 0
    /// with the Dock hidden or at the side, and in a scripted run and a film, which have no Dock.
    public let bottomInset: Double
    public var tokens: Tokens
    public var reduceMotion = false
    var origin = (x: 0.0, y: 0.0)
    var texts: [Box] = []
    /// What each read line says, in the order of `texts`.
    var read: [String] = []
    var holds: [Hold] = []
    var heard: [(word: String, at: Double)] = []
    var asks: [Ask] = []
    var marks: [Mark] = []
    var boards: [Board] = []
    var echoes: [Echo] = []
    var ways: [Way] = []
    /// One line of the guide's card: what to do next and which step it is, or the closing line when every step is
    /// done; no words take the card away. `shownAt` is when the line gets its turn on the card, which is when it
    /// came or later, and `upSince` since when its card has been up.
    struct Next { var text: String; var n, of: Int; var done: Bool; var shownAt: Double; var upSince: Double }
    /// Every line the guide's card has been sent, in order. The last one whose turn has come is the one it shows.
    var nexts: [Next] = []
    /// The menu's "Show the guide". Off, the card is not drawn; the steps are still taken.
    public var guideOn = true
    /// The date last opened in his calendar, and when: the toast says so for a while.
    var opened: (at: Double, label: String?)?
    /// The nudge card of each line said without being asked, by its ask's id (`SceneNudge.swift`).
    var cards: [String: Card] = [:]
    /// The words of every card he has answered or whose date was opened, and when: those words get no card again.
    var answered: [(text: String, at: Double)] = []
    var clips: [Clip] = []
    /// His last click on a mark that waited for it: when, where paral's cursor's tip was then, and which mark.
    var clicked: (at: Double, x: Double, y: Double, mark: String)?
    var trail: [(x: Double, y: Double, at: Double)] = []
    /// Each chunk of the microphone's sound: when it came, how long it lasts and how loud it was. The wave reads it.
    var sounds: [(at: Double, ms: Double, level: Double)] = []
    var failed: (detail: String, at: Double)?
    var idleAt: Double?
    var closedAt: Double?
    var lastAt = 0.0

    public init(width: Double, height: Double, tokens: Tokens, bottomInset: Double = 0) {
        self.width = width
        self.height = height
        self.tokens = tokens
        self.bottomInset = bottomInset
    }

    public mutating func take(_ seen: Seen, at: Double) {
        lastAt = max(lastAt, at)
        switch seen {
        case .keyDown:
            goes(at)
            for i in asks.indices where asks[i].cutAt == nil { asks[i].cutAt = at }
            for i in echoes.indices where echoes[i].clearedAt == nil { echoes[i].clearedAt = at }
            // A card still empty when he presses again was never filled, and goes.
            for i in boards.indices where boards[i].clearedAt == nil && boards[i].rows.isEmpty { boards[i].clearedAt = at }
            holds.append(Hold(down: at))
            heard = []; trail = []; failed = nil; idleAt = nil; closedAt = nil
        case .keyUp:
            if let last = holds.indices.last, holds[last].up == nil { holds[last].up = at }
        case .typed(let text):
            // A tapped or typed ask is a hold of no length: what a press does to the screen, and its release, at once.
            // When its words are the nudge card's own ask, it answers the card first, and the card waits for the date.
            if text.lowercased().trimmingCharacters(in: .whitespaces) == Nudge.asks { answer(.add, at) }
            take(.keyDown, at: at)
            take(.keyUp, at: at)
        case .notNow:
            answer(.notNow, at)
        case .trail(let x, let y):
            trail.append((x - origin.x, y - origin.y, at))
        case .mic(let level, let ms):
            sounds.append((at, ms, level))
        case .screen(let display, let lines):
            origin = (display.x, display.y)
            texts = lines.map { Box(x: $0.box.x / display.scale, y: $0.box.y / display.scale, w: $0.box.w / display.scale, h: $0.box.h / display.scale) }
            read = lines.map(\.text)
        case .state(let name, let detail):
            // The first failure since the last press is the cause; one that follows it is its consequence.
            if name == "failed", failed == nil { failed = (detail ?? "", at) }
            if name == "idle" { idleAt = at }
            // The ask the card's button made is over and no date was opened: the card does not wait any longer.
            if name == "idle" || name == "failed" { goes(at, onlyAnswered: true) }
        case .heard(let text, _):
            let words = text.split(separator: " ").map(String.init)
            heard = words.enumerated().map { i, word in i < heard.count && heard[i].word == word ? heard[i] : (word, at) }
        case .say(let id, let beat, let text, _, let trail, let keep):
            // A line said without being asked waits its turn: the line before it stands its time first.
            let fresh = !asks.contains { $0.id == id }
            let comes = fresh && trail != nil ? turn(after: at) : at
            if fresh, trail != nil { cards[id] = card(text, keep: keep, comes: comes) }
            if fresh { asks.append(Ask(id: id, beganAt: comes)) }
            edit(id) {
                $0.beats[beat] = Beat(text: text, sayAt: comes)
                if let trail { $0.trail = trail }
            }
        case .voice(let id, let beat, let pcm, _):
            edit(id) { ask in
                guard ask.beats[beat] != nil, !pcm.isEmpty else { return }
                if ask.beats[beat]!.soundAt == nil { ask.beats[beat]!.soundAt = at }
                ask.beats[beat]!.levels.append((ask.beats[beat]!.bytes, Meter.level(pcm)))
                ask.beats[beat]!.bytes += pcm.count
            }
        case .words(let id, let beat, let start, _):
            edit(id) { $0.beats[beat]?.wordStart += start }
        case .mute(let id):
            edit(id) { $0.mutedAt = at }
        case .mark(let id, let beat, let kind, let box, let label, let tone, let spot):
            // The first mark of an ask lands the moment it arrives; later ones wait for their sentence.
            let withSay = asks.first { $0.id == id }?.beats[beat] != nil && marks.contains { $0.id == id }
            let here = box.moved(dx: -origin.x, dy: -origin.y)
            // A new mark takes the place of the one on its line; a tag stands beside a line's ink, so it takes only a tag's.
            for i in marks.indices where marks[i].clearedAt == nil && Scene.sameLine(marks[i].box, here) && (marks[i].kind == .tag) == (kind == .tag) { marks[i].clearedAt = at }
            // His own loop gives way once paral marks something inside it.
            for i in echoes.indices where echoes[i].clearedAt == nil && Scene.sameLine(echoes[i].box, here) { echoes[i].clearedAt = at }
            // The thing an arrow led to is in view once the same look or answer marks it, so that arrow goes.
            for i in ways.indices where ways[i].clearedAt == nil && ways[i].id == id { ways[i].clearedAt = at }
            marks.append(Mark(id: id, beat: beat, kind: kind, box: here, label: label, tone: tone, spot: spot, at: at, withSay: withSay))
        case .next(let text, let n, let of, let done):
            // New words take the place of the old in the same card once the old have stood their time, and no words
            // take the card away the same way. After an empty card a line comes at once.
            let card = nexts.last.flatMap { $0.text.isEmpty ? nil : $0 }
            let comes = max(at, card.map { $0.shownAt + stand($0.text) } ?? nexts.last?.shownAt ?? at)
            nexts.append(Next(text: text, n: n, of: of, done: done, shownAt: comes, upSince: card?.upSince ?? comes))
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
            clips.append(Clip(id: id, path: path, still: still, seconds: seconds, at: at, room: Layout.room(texts: texts, width: width, height: floor, tokens: tokens)))
        case .boardClose(let id):
            for i in boards.indices where boards[i].id == id && boards[i].clearedAt == nil && boards[i].rows.isEmpty { boards[i].clearedAt = at }
        case .board(let id, let rows, let now):
            for i in clips.indices where clips[i].clearedAt == nil { clips[i].clearedAt = at }
            // A board for an ask whose empty card is open fills that card; it does not open a second one.
            if let open = boards.lastIndex(where: { $0.id == id && $0.clearedAt == nil && $0.rows.isEmpty }) {
                boards[open].rows = rows
                boards[open].now = now
                boards[open].filledAt = at
                break
            }
            // The same rows coming again right after a clear are the same card: the next step of a walk, or a look
            // that moved the box with the page. It does not fade in a second time, and it stays where it is unless
            // the page has moved and put text where the card was.
            let same = boards.last { $0.rows == rows && $0.clearedAt.map { at - $0 <= Scene.together } ?? false }
            let kept = same.flatMap { old in texts.contains { Scene.touch($0, old.room) } ? nil : old.room }
            boards.append(Board(id: id, rows: rows, now: now, at: at, upSince: same?.upSince ?? at, room: kept ?? Layout.room(texts: texts, width: width, height: floor, tokens: tokens)))
        case .clear:
            wipe(at)
        case .close:
            goes(at)
            wipe(at)
            for i in echoes.indices where echoes[i].clearedAt == nil { echoes[i].clearedAt = at }
            closedAt = at
            for i in asks.indices where asks[i].cutAt == nil { asks[i].cutAt = at }
            if let last = holds.indices.last, holds[last].up == nil { holds[last].up = at }
        case .ready:
            // The mind is linked. A failure from before the first press (the mind was not running) no longer stands.
            if holds.isEmpty { failed = nil }
        case .open(_, let label):
            opened = (at, label)
            kept(at)
        case .click(let x, let y):
            click(x: x, y: y, at: at)
        case .other:
            break
        }
    }

    /// The lines of one look or one answer are sent in one go and reach the scene within a few ms of each other. A
    /// tenth of a second is ample for that and far less than he takes to do anything. Not measured on the real socket.
    static let together = 100.0

    static func touch(_ a: Box, _ b: Box) -> Bool { a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h }

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
