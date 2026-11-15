import Foundation

/// The kinds of stroke. `box` is only for his own loop coming back around several lines; the mind never sends it as a mark.
public enum MarkKind: String { case ring, underline, wavy, bracket, box }

public struct BodySettings: Equatable {
    public var holdKey: String
    public var drawKey: String
    public var earGraceMs, markPad, pictureLongEdge: Double
    /// The room kept round what he drew around when the picture is cut down: a share of the loop's size, or points.
    public var cropShare = 1.0, cropPoints = 200.0
    /// How often to look at the display with no key pressed; 0 is never.
    public var lookEveryMs = 0.0
    /// Lines he can tap in the menu instead of saying them, in groups.
    public var cues: [Cue] = []
}

/// Everything the scene can be told, from either side of the seam. The windows and the film feed it the same way.
public enum Seen {
    case ready(BodySettings)
    case keyDown, keyUp, close
    /// An ask whose words were tapped or typed: for what is on screen, a press and a release at the same moment.
    case typed
    case trail(x: Double, y: Double)
    case screen(display: DisplayPlace, lines: [ReadLine])
    case state(name: String, detail: String?)
    case heard(text: String, final: Bool)
    /// `trail` is nil for a line of an answer he asked for. A line said without being asked carries the steps paral took.
    case say(id: String, beat: Int, text: String, aside: Bool, trail: [String]?)
    case voice(id: String, beat: Int, pcm: Data, last: Bool)
    case words(id: String, beat: Int, start: [Double], end: [Double])
    case mute(id: String)
    /// A calendar file the mind has written. The scene shows nothing for it; the app opens it (see `Keep`).
    case open(path: String)
    case mark(id: String, beat: Int, kind: MarkKind, box: Box, label: String?)
    /// The thing is on this page and not in view: which way to scroll ("up" or "down") and what it leads to.
    case way(id: String, to: String, toward: String)
    case echo(id: String, box: Box, shape: String)
    /// `now` is set on a board of steps: the number of the row that is the step he is on, from 0.
    case board(id: String, rows: [[String]], now: Int?)
    case boardClose(id: String)
    case clip(id: String, path: String, still: String, seconds: Double)
    case clear
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
            settings.cues = (f["cues"] as? [[String: Any]] ?? []).compactMap { cue in
                guard let name = cue["name"] as? String, let lines = cue["lines"] as? [String] else { return nil }
                return Cue(name: name, lines: lines)
            }
            return .success(.ready(settings))
        case "key.down": return .success(.keyDown)
        case "key.up": return .success(.keyUp)
        case "typed": return .success(.typed)
        case "close": return .success(.close)
        case "clear": return .success(.clear)
        case "hello", "mic": return .success(.other)
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
            return .success(.say(id: id, beat: beat, text: text, aside: f["aside"] as? Bool ?? false, trail: f["trail"] as? [String]))
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
            return .success(.open(path: path))
        case "mark":
            guard let id, let beat, let kind = MarkKind(rawValue: s("kind") ?? ""), let b = box(f["box"]) else {
                return .failure(Refused("mark: id, beat, a known kind and a box with positive w and h are needed"))
            }
            return .success(.mark(id: id, beat: beat, kind: kind, box: b, label: s("label")))
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
