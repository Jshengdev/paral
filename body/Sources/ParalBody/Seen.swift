import Foundation

/// The kinds of stroke. `box` is only for his own loop coming back around several lines; the mind never sends it as a mark.
/// `tick` says a line is done and `strike` that it has passed; a `tag` is not ink but a chip of a few words by its line.
public enum MarkKind: String { case ring, underline, wavy, bracket, box, tick, strike, tag }

/// How a tag looks: `strong` for what is next, `quiet` for what is done or passed, `date` for a count of days.
public enum Tone: String { case strong, quiet, date }

public struct BodySettings: Equatable {
    public var holdKey: String
    public var drawKey: String
    public var earGraceMs, markPad, pictureLongEdge: Double
    /// The room kept round what he drew around when the picture is cut down: a share of the loop's size, or points.
    public var cropShare = 1.0, cropPoints = 200.0
    /// How often to look at the display with no key pressed; 0 is never.
    public var lookEveryMs = 0.0
    public var lookFastMost = 0
    /// The demo's bank: lines he can tap in the menu instead of saying them, in groups, each with the page it is run on.
    public var cues: [Cue] = []
    /// One line that says what this is; empty for none. The app shows it once when it starts, in the capsule and not
    /// spoken. A scripted run does not show it.
    public var opening = ""
}

/// One thing a line offers to do for him, as the primary button of its card: the button's words, and the words sent
/// as a tapped line when it is pressed.
public struct Offer: Equatable {
    public var label, send: String
    public init(label: String, send: String) { self.label = label; self.send = send }
}

/// Everything the scene can be told, from either side of the seam. The windows and the film feed it the same way.
public enum Seen {
    case ready(BodySettings)
    case keyDown, keyUp, close
    /// He pressed the left button here, in display points from the top-left corner. The scene draws nothing for it yet.
    case click(x: Double, y: Double)
    /// An ask whose words were tapped or typed: for what is on screen, a press and a release at the same moment. Its
    /// words are read only to see whether they are the nudge card's own ask (`Nudge.asks`).
    case typed(text: String)
    /// He pressed "Not now" on the nudge card. It never crosses the seam: the body tells itself.
    case notNow
    case trail(x: Double, y: Double)
    /// A chunk of the microphone's sound: how loud it was, 0 to 1 (`Meter`), and how long it lasts. Only the wave shows it.
    case mic(level: Double, ms: Double)
    case screen(display: DisplayPlace, lines: [ReadLine])
    case state(name: String, detail: String?)
    case heard(text: String, final: Bool)
    /// `trail` is nil for a line of an answer he asked for. A line said without being asked carries the steps paral took,
    /// and `keep` when it shows a date he can ask to keep: its card then offers "Add to calendar" (false when absent).
    /// `offer` is one thing any line offers to do, as its card's button; it wins over `keep`.
    case say(id: String, beat: Int, text: String, aside: Bool, trail: [String]?, keep: Bool, offer: Offer?)
    case voice(id: String, beat: Int, pcm: Data, last: Bool)
    case words(id: String, beat: Int, start: [Double], end: [Double])
    case mute(id: String)
    /// A calendar file the mind has written. The scene shows nothing for it; the app opens it (see `Keep`).
    /// `label` is the date in a few words ("November 22"), which the toast shows.
    case open(path: String, label: String?)
    /// A page of USC's he asked to be taken to, and its name for the toast. The app opens it (`Keep.go`).
    case go(id: String, url: String, label: String?)
    /// He asked to be scrolled to what the arrow points at, or for the closed heading paral has boxed to be opened,
    /// by one click at a point of the display. The app does it for him (`Does`); the scene shows nothing.
    case scroll(id: String, down: Bool)
    case press(id: String, x: Double, y: Double)
    /// From the app's own watcher, never from the mind: the page has moved away from under paral's marks (true), or
    /// stands again as it did (false). While it has, the scene does not draw them (`SceneStale.swift`). With `hand`
    /// it is the app's own scrolling that begins (true) or has ended (false): until it ends the marks and the card
    /// wait, so nothing is drawn in a place it will not stay.
    case stale(Bool, hand: Bool = false)
    /// `tone` is only for a tag, whose words are its `label`; a tag with no tone is quiet. `spot` is true for a mark on a
    /// place of a drawing (an atom), not a line: no arrow leads from it and the cursor does not go to it.
    case mark(id: String, beat: Int, kind: MarkKind, box: Box, label: String?, tone: Tone?, spot: Bool)
    /// The thing is on this page and not in view: which way to scroll ("up" or "down") and what it leads to.
    case way(id: String, to: String, toward: String)
    case echo(id: String, box: Box, shape: String)
    /// `now` is set on a board of steps: the number of the row that is the step he is on, from 0.
    case board(id: String, rows: [[String]], now: Int?)
    case boardClose(id: String)
    case clip(id: String, path: String, still: String, seconds: Double)
    case clear
    /// The demo's guide: what to do next on this page, step `n` of `of`. An empty text means no card; `done` marks the closing line.
    case next(text: String, n: Int, of: Int, done: Bool)
    case other

    public static func read(_ text: String) -> Result<Seen, Refused> {
        guard let data = text.data(using: .utf8), let fields = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return .failure(Refused("not JSON"))
        }
        return from(fields)
    }

    public static func from(_ f: [String: Any]) -> Result<Seen, Refused> {
        guard f["v"] as? Int == seamVersion else { return .failure(Refused("v: expected \(seamVersion)")) }
        func s(_ key: String) -> String? { f[key] as? String }
        func n(_ key: String, _ from: [String: Any]? = nil) -> Double? { ((from ?? f)[key] as? NSNumber)?.doubleValue }
        func box(_ any: Any?) -> Box? {
            guard let b = any as? [String: Any], let x = n("x", b), let y = n("y", b), let w = n("w", b), let h = n("h", b), w > 0, h > 0 else { return nil }
            return Box(x: x, y: y, w: w, h: h)
        }
        let type = s("type") ?? ""
        let id = s("id"), beat = (f["beat"] as? NSNumber)?.intValue
        switch type {
        case "ready":
            guard let key = s("holdKey"), let grace = n("earGraceMs"), let pad = n("markPad"), let edge = n("pictureLongEdge") else {
                return .failure(Refused("ready: holdKey, earGraceMs, markPad and pictureLongEdge are needed"))
            }
            var settings = BodySettings(holdKey: key, drawKey: s("drawKey") ?? "shift", earGraceMs: grace, markPad: pad, pictureLongEdge: edge)
            if let crop = f["cropAround"] as? [String: Any], let share = n("share", crop), let points = n("points", crop) {
                settings.cropShare = share
                settings.cropPoints = points
            }
            settings.lookEveryMs = n("lookEveryMs") ?? 0
            settings.lookFastMost = Int(n("lookFastMost") ?? 0)
            settings.opening = s("opening") ?? ""
            settings.cues = Cue.read(f["cues"])
            return .success(.ready(settings))
        case "key.down": return .success(.keyDown)
        case "key.up": return .success(.keyUp)
        case "typed": return .success(.typed(text: s("text") ?? ""))
        case "close": return .success(.close)
        case "clear": return .success(.clear)
        case "next":
            guard let text = s("text") else { return .failure(Refused("next.text: missing")) }
            return .success(.next(text: text, n: (f["n"] as? NSNumber)?.intValue ?? 0, of: (f["of"] as? NSNumber)?.intValue ?? 0, done: f["done"] as? Bool ?? false))
        case "hello": return .success(.other)
        case "mic":
            guard let pcm = s("pcm"), let sound = Data(base64Encoded: pcm) else { return .failure(Refused("mic: pcm is needed")) }
            return .success(.sound(sound))
        case "click":
            guard let x = n("x"), let y = n("y") else { return .failure(Refused("click: x and y are needed")) }
            return .success(.click(x: x, y: y))
        case "trail":
            guard let x = n("x"), let y = n("y") else { return .failure(Refused("trail: x and y are needed")) }
            return .success(.trail(x: x, y: y))
        // A look with no key pressed tells the scene the same thing a screen line does: where the page's text is.
        case "screen", "look":
            guard let d = f["display"] as? [String: Any], let scale = n("scale", d), let x = n("x", d), let y = n("y", d), let rows = f["lines"] as? [[String: Any]] else {
                return .failure(Refused("screen: display and lines are needed"))
            }
            let lines = rows.compactMap { row -> ReadLine? in
                guard let text = row["text"] as? String, let b = box(row["box"]) else { return nil }
                return ReadLine(text: text, box: b)
            }
            return .success(.screen(display: DisplayPlace(id: (d["id"] as? NSNumber)?.intValue ?? 0, scale: scale, x: x, y: y), lines: lines))
        case "state":
            guard let name = s("name") else { return .failure(Refused("state.name: missing")) }
            return .success(.state(name: name, detail: s("detail")))
        case "heard":
            guard let text = s("text"), let final = f["final"] as? Bool else { return .failure(Refused("heard: text and final are needed")) }
            return .success(.heard(text: text, final: final))
        case "say":
            guard let id, let beat, let text = s("text"), !text.isEmpty else { return .failure(Refused("say: id, beat and text are needed")) }
            let offer = (f["offer"] as? [String: Any]).flatMap { o in (o["label"] as? String).flatMap { label in (o["send"] as? String).map { Offer(label: label, send: $0) } } }
            return .success(.say(id: id, beat: beat, text: text, aside: f["aside"] as? Bool ?? false, trail: f["trail"] as? [String], keep: f["keep"] as? Bool ?? false, offer: offer.flatMap { $0.label.isEmpty || $0.send.isEmpty ? nil : $0 }))
        case "voice":
            guard let id, let beat, let pcm = s("pcm"), let sound = Data(base64Encoded: pcm) else { return .failure(Refused("voice: id, beat and pcm are needed")) }
            return .success(.voice(id: id, beat: beat, pcm: sound, last: f["last"] as? Bool ?? false))
        case "words":
            guard let id, let beat, let start = f["start"] as? [NSNumber], let end = f["end"] as? [NSNumber] else { return .failure(Refused("words: id, beat, start and end are needed")) }
            return .success(.words(id: id, beat: beat, start: start.map(\.doubleValue), end: end.map(\.doubleValue)))
        case "mute":
            guard let id else { return .failure(Refused("mute.id: missing")) }
            return .success(.mute(id: id))
        case "open":
            guard let path = s("path"), !path.isEmpty else { return .failure(Refused("open.path: missing")) }
            return .success(.open(path: path, label: s("label")))
        case "scroll":
            guard let id, let to = s("to"), ["up", "down"].contains(to) else { return .failure(Refused("scroll: id and to (up or down) are needed")) }
            return .success(.scroll(id: id, down: to == "down"))
        case "stale":
            return .success(.stale(f["moved"] as? Bool ?? false, hand: f["hand"] as? Bool ?? false))
        case "press":
            guard let id, let x = n("x"), let y = n("y") else { return .failure(Refused("press: id, x and y are needed")) }
            return .success(.press(id: id, x: x, y: y))
        case "go":
            guard let id, let url = s("url"), !url.isEmpty else { return .failure(Refused("go: id and url are needed")) }
            return .success(.go(id: id, url: url, label: s("label")))
        case "mark":
            guard let id, let beat, let kind = MarkKind(rawValue: s("kind") ?? ""), let b = box(f["box"]) else {
                return .failure(Refused("mark: id, beat, a known kind and a box with positive w and h are needed"))
            }
            let tone = s("tone").map { Tone(rawValue: $0) }
            if tone == .some(nil) { return .failure(Refused("mark.tone: strong, quiet or date")) }
            if kind == .tag, (s("label") ?? "").isEmpty { return .failure(Refused("mark: a tag needs its words in label")) }
            return .success(.mark(id: id, beat: beat, kind: kind, box: b, label: s("label"), tone: tone ?? nil, spot: f["spot"] as? Bool ?? false))
        case "way":
            guard let id, let to = s("to"), ["up", "down"].contains(to), let toward = s("toward"), !toward.isEmpty else { return .failure(Refused("way: id, to (up or down) and toward are needed")) }
            return .success(.way(id: id, to: to, toward: toward))
        case "echo":
            guard let id, let b = box(f["box"]) else { return .failure(Refused("echo: id and a box with positive w and h are needed")) }
            return .success(.echo(id: id, box: b, shape: s("shape") ?? "loop"))
        case "clip":
            guard let id, let path = s("clip"), let still = s("still"), let seconds = n("seconds"), seconds > 0 else { return .failure(Refused("clip: id, clip, still and seconds are needed")) }
            return .success(.clip(id: id, path: path, still: still, seconds: seconds))
        case "board":
            guard let id, let rows = f["rows"] as? [[String]] else { return .failure(Refused("board: id and rows are needed")) }
            return .success(.board(id: id, rows: rows, now: (f["now"] as? NSNumber)?.intValue))
        case "board.close":
            guard let id else { return .failure(Refused("board.close.id: missing")) }
            return .success(.boardClose(id: id))
        default:
            return .failure(Refused("type: unknown \"\(type)\""))
        }
    }
}
