import AppKit
import ImageIO
import UniformTypeIdentifiers

/// Replays a recorded run through the scene and the painter, off screen. No service is called.
public enum Film {
    public struct Made {
        public var frames: Int
        public var seconds: Double
        public var voiceSeconds: Double
        public var skipped: Int
        /// Each change of the capsule's look, with the film's time of the first frame that shows it.
        public var looks: [(at: Double, look: String)]
    }
    static let rate = 24000.0

    struct Loaded { var pages: FilmPages; var w, h: Double; var events: [(at: Double, seen: Seen)]; var sound: [String: Data]; var skipped: Int }

    /// A recorded run as the film needs it: the page's picture, the display's size, and every line in order. The
    /// scene is told of the page's ink at the foot as the app tells it (`Screen.taken`), for `tokens` and a Dock of
    /// `inset`; the record's lines are the mind's and are not changed.
    static func load(_ dir: URL, tokens: Tokens, inset: Double = 0) throws -> Loaded {
        guard let flow = try JSONSerialization.jsonObject(with: Data(contentsOf: dir.appendingPathComponent("flow.json"))) as? [String: Any],
              let display = flow["display"] as? [String: Any], let pagePath = flow["page"] as? String,
              let w = (display["w"] as? NSNumber)?.doubleValue, let h = (display["h"] as? NSNumber)?.doubleValue
        else { throw Screen.Failed(why: "flow.json needs display.w, display.h and page") }
        var pages = try FilmPages(flow: flow, first: try Screen.load(pagePath))

        var events: [(at: Double, seen: Seen)] = []
        var sound: [String: Data] = [:]
        var skipped = 0
        var down: (record: Double, stamp: Double)?
        for row in try String(contentsOf: dir.appendingPathComponent("session.jsonl"), encoding: .utf8).split(separator: "\n") {
            guard let record = try? JSONSerialization.jsonObject(with: Data(row.utf8)) as? [String: Any],
                  var at = (record["at"] as? NSNumber)?.doubleValue, let fields = record["line"] as? [String: Any],
                  case .success(var seen) = Seen.from(fields)
            else { skipped += 1; continue }
            // The record holds when each line reached the mind. The key-up line is sent after the microphone's tail,
            // but it carries the moment his finger lifted. The live scene takes the release at that moment, so the
            // film does too: the stamp is carried over to the record's clock by way of the key-down before it.
            let stamp = (fields["at"] as? NSNumber)?.doubleValue
            if case .keyDown = seen, let stamp { down = (at, stamp) }
            if case .keyUp = seen, let stamp, let down { at = min(at, down.record + (stamp - down.stamp)) }
            pages.take(fields, at: at)
            if case .screen(let display, let lines) = seen, let read = ((fields["picture"] as? [String: Any])?["w"] as? NSNumber)?.doubleValue {
                let share = Layout.inkFrom(width: w, height: h - inset, tokens: tokens) / max(h, 1)
                seen = .screen(display: display, lines: Screen.taken(pages.pictures[pages.page(at: at)], lines, below: share, width: read))
            }
            events.append((at, seen))
            if case .voice(let id, let beat, let pcm, _) = seen { sound["\(id)/\(beat)", default: Data()].append(pcm) }
        }
        // Moving the release earlier can put it ahead of lines that arrived before it; the order is by time again.
        let ordered = events.enumerated().sorted { ($0.element.at, $0.offset) < ($1.element.at, $1.offset) }.map(\.element)
        return Loaded(pages: pages, w: w, h: h, events: ordered, sound: sound, skipped: skipped)
    }

    /// One frame of a recorded run at one moment, drawn the way the film draws it. For looking at a change of tokens
    /// without filming the whole run. Gives back when the run ends, in ms.
    public static func frame(run: String, tokens: Tokens, at moment: Double, to out: String) throws -> Double {
        let run = try load(URL(fileURLWithPath: run), tokens: tokens)
        var whole = Scene(width: run.w, height: run.h, tokens: tokens)
        for event in run.events { whole.take(event.seen, at: event.at) }
        var scene = Scene(width: run.w, height: run.h, tokens: tokens)
        for event in run.events where event.at <= moment { scene.take(event.seen, at: event.at) }
        let painter = Painter(tokens: tokens, width: run.w, height: run.h)
        let page = run.pages.pictures[run.pages.page(at: moment)]
        try save(render(page, run.w, run.h) { ctx in _ = painter.paint(scene.picture(at: moment), into: ctx) }, to: URL(fileURLWithPath: out))
        return whole.end
    }

    /// What the capsule shows at each of the given moments of a recorded run: its look and its note.
    public static func capsule(run: String, tokens: Tokens, at moments: [Double]) throws -> [(look: String, note: String?)] {
        let run = try load(URL(fileURLWithPath: run), tokens: tokens)
        return moments.map { moment in
            var scene = Scene(width: run.w, height: run.h, tokens: tokens)
            for event in run.events where event.at <= moment { scene.take(event.seen, at: event.at) }
            let capsule = scene.picture(at: moment).capsule
            return (capsule.look.rawValue, capsule.note)
        }
    }

    /// Where the painter puts each thing at each of the given moments of a recorded run, and the way arrow's, the
    /// cursor's and the board's own values then. For rows: a film's record says when a thing's box changes, and not when the thing goes.
    /// `notNow` are the moments he pressed "Not now" on the nudge card, which no line of a record carries.
    public static func placed(run: String, tokens: Tokens, at moments: [Double], guide: Bool = true, inset: Double = 0, notNow: [Double] = []) throws -> [[String: Any]] {
        let run = try load(URL(fileURLWithPath: run), tokens: tokens, inset: inset)
        let painter = Painter(tokens: tokens, width: run.w, height: run.h)
        let events = (run.events + notNow.map { ($0, Seen.notNow) }).enumerated().sorted { ($0.element.at, $0.offset) < ($1.element.at, $1.offset) }.map(\.element)
        return moments.map { moment in
            var scene = Scene(width: run.w, height: run.h, tokens: tokens, bottomInset: inset)
            scene.guideOn = guide
            for event in events where event.at <= moment { scene.take(event.seen, at: event.at) }
            let picture = scene.picture(at: moment)
            var placed: [Drawn] = []
            _ = render(run.pages.pictures[0], run.w, run.h) { ctx in placed = painter.paint(picture, into: ctx) }
            let way: Any = picture.way.map { ["id": $0.id, "to": $0.down ? "down" : "up", "toward": $0.toward, "drawn": $0.drawn, "nod": $0.nod] as [String: Any] } ?? NSNull()
            let pointer: Any = picture.pointer.map { ["x": $0.x, "y": $0.y, "ripple": $0.ripple ?? NSNull(), "flight": $0.withWay?.flight ?? NSNull(), "tag": $0.tag, "thinking": $0.thinking] as [String: Any] } ?? NSNull()
            let board: Any = picture.board.map { ["id": $0.id, "now": $0.now ?? NSNull(), "appear": $0.appear] as [String: Any] } ?? NSNull()
            // A drawn arrow's row also gives the points the pen has inked, so a row can say what it lies on.
            let items = placed.map { item in ["what": item.what, "id": item.id ?? "", "box": item.box.json].merging(item.path.map { ["path": $0.map { [$0.x, $0.y] }] } ?? [:]) { $1 } as [String: Any] }
            return ["placed": items, "way": way, "pointer": pointer, "board": board, "toast": picture.toast?.text ?? NSNull(), "inked": picture.marks.map(\.drawn),
                    "capsule": pill(picture.capsule, painter),
                    "guide": picture.guide.map { ["text": $0.text, "n": $0.n ?? NSNull(), "of": $0.of ?? NSNull(), "appear": $0.appear] as [String: Any] } ?? NSNull(),
                    "nudge": picture.nudge.map { ["text": $0.text, "inked": $0.words.filter { $0.bright >= 1 }.count, "trail": $0.trail.map(\.text), "buttons": $0.offer != nil, "offer": $0.offer?.label ?? NSNull(), "appear": $0.coming.card, "rows": $0.coming.lines, "leave": $0.coming.gone] as [String: Any] } ?? NSNull()]
        }
    }

    /// The capsule's look and words for a row: what it says, which of its words are in stone, its note, the steps of
    /// its trail, whether its caret is up, its wave as the marks the painter draws, oldest first (none for the still
    /// dots), and whether the logo mark by it breathes to say paral is working.
    static func pill(_ c: CapsulePicture, _ painter: Painter) -> [String: Any] {
        ["look": c.look.rawValue, "says": c.words.map(\.text).joined(separator: " "), "stone": c.words.filter { $0.bright < 1 }.map(\.text),
         "note": c.note ?? NSNull(), "trail": c.trail.map(\.text), "caret": c.caret ?? NSNull(), "wave": painter.marks(of: c.wave), "working": c.working != nil]
    }

    public static func make(run: String, tokens: Tokens, fps: Double = 30) throws -> Made {
        let dir = URL(fileURLWithPath: run)
        let loaded = try load(dir, tokens: tokens)
        let pages = loaded.pages, w = loaded.w, h = loaded.h, events = loaded.events, sound = loaded.sound, skipped = loaded.skipped
        var whole = Scene(width: w, height: h, tokens: tokens)
        for event in events { whole.take(event.seen, at: event.at) }
        let end = whole.end

        let frames = dir.appendingPathComponent("frames")
        try? FileManager.default.removeItem(at: frames)
        try FileManager.default.createDirectory(at: frames, withIntermediateDirectories: true)
        let painter = Painter(tokens: tokens, width: w, height: h)
        try save(render(pages.pictures[0], w, h) { _ in }, to: frames.appendingPathComponent("f_00000.png"))
        // The page under the ink, and for each page that has come up the frame it is under the ink from. A run of one
        // page writes nothing more than it always did.
        var page = 0
        var cameUp: [[String: Int]] = [["page": 0, "fromFrame": 0]]

        var scene = Scene(width: w, height: h, tokens: tokens)
        var next = 0, frame = 1
        var lastBox: [String: Box] = [:]
        var lastLook = ""
        var looks: [(at: Double, look: String)] = []
        var drawn = ""
        while Double(frame - 1) * 1000 / fps <= end {
            let t = Double(frame - 1) * 1000 / fps
            while next < events.count, events[next].at <= t { scene.take(events[next].seen, at: events[next].at); next += 1 }
            var placed: [Drawn] = []
            let picture = scene.picture(at: t)
            if looks.last?.look != picture.capsule.look.rawValue { looks.append((t.rounded(), picture.capsule.look.rawValue)) }
            if pages.page(at: t) != page {
                page = pages.page(at: t)
                try save(render(pages.pictures[page], w, h) { _ in }, to: frames.appendingPathComponent("bare-\(cameUp.count).png"))
                cameUp.append(["page": cameUp.count, "fromFrame": frame])
            }
            let image = render(pages.pictures[page], w, h) { ctx in placed = painter.paint(picture, into: ctx) }
            try save(image, to: frames.appendingPathComponent(String(format: "f_%05d.png", frame)))
            for item in placed {
                let key = item.what + "/" + (item.id ?? "")
                let box = Box(x: (item.box.x * 2).rounded() / 2, y: (item.box.y * 2).rounded() / 2, w: (item.box.w * 2).rounded() / 2, h: (item.box.h * 2).rounded() / 2)
                // The capsule's row also names its look, and a new row is written when the look changes though the box does not.
                let look = item.what == "capsule" ? picture.capsule.look.rawValue : nil
                guard lastBox[key] != box || (look != nil && look != lastLook) else { continue }
                lastBox[key] = box
                var line: [String: Any] = ["at": t.rounded(), "what": item.what, "box": box.json]
                if let id = item.id { line["id"] = id }
                // A board's row also says how large its words were drawn, so a reader need not work it out from the card.
                if let type = item.type { line["type"] = (type * 10).rounded() / 10 }
                if let look {
                    line["look"] = look
                    lastLook = look
                }
                drawn += String(decoding: try JSONSerialization.data(withJSONObject: line, options: [.sortedKeys]), as: UTF8.self) + "\n"
            }
            frame += 1
        }
        try drawn.write(to: dir.appendingPathComponent("drawn.jsonl"), atomically: true, encoding: .utf8)
        if cameUp.count > 1 { try JSONSerialization.data(withJSONObject: cameUp, options: [.sortedKeys]).write(to: frames.appendingPathComponent("pages.json")) }

        var track = Data(count: Int(end / 1000 * rate) * 2 + 2)
        var voiced = 0.0
        for beat in whole.spoken {
            guard let pcm = sound["\(beat.id)/\(beat.beat)"] else { continue }
            let offset = Int(beat.start / 1000 * rate) * 2
            let length = min(pcm.count, Int((beat.end - beat.start) / 1000 * rate) * 2, track.count - offset) & ~1
            guard length > 0 else { continue }
            track.replaceSubrange(offset..<(offset + length), with: pcm.prefix(length))
            voiced += Double(length) / 2 / rate
        }
        try wav(track).write(to: dir.appendingPathComponent("voice.wav"))
        return Made(frames: frame - 1, seconds: end / 1000, voiceSeconds: voiced, skipped: skipped, looks: looks)
    }

    /// One frame: the page, then whatever `draw` adds, in a space with its origin top-left and y growing downward.
    static func render(_ page: CGImage, _ w: Double, _ h: Double, _ draw: (CGContext) -> Void) -> CGImage {
        let ctx = CGContext(data: nil, width: Int(w), height: Int(h), bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.interpolationQuality = .medium
        ctx.draw(page, in: CGRect(x: 0, y: 0, width: w, height: h))
        ctx.translateBy(x: 0, y: h)
        ctx.scaleBy(x: 1, y: -1)
        draw(ctx)
        return ctx.makeImage()!
    }

    static func save(_ image: CGImage, to url: URL) throws {
        guard let out = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { throw Screen.Failed(why: "could not open \(url.path)") }
        CGImageDestinationAddImage(out, image, nil)
        guard CGImageDestinationFinalize(out) else { throw Screen.Failed(why: "could not write \(url.path)") }
    }

    static func wav(_ pcm: Data) -> Data {
        func le<T: FixedWidthInteger>(_ value: T) -> Data { withUnsafeBytes(of: value.littleEndian) { Data($0) } }
        var out = Data("RIFF".utf8) + le(UInt32(36 + pcm.count)) + Data("WAVEfmt ".utf8)
        out += le(UInt32(16)) + le(UInt16(1)) + le(UInt16(1)) + le(UInt32(rate)) + le(UInt32(rate * 2)) + le(UInt16(2)) + le(UInt16(16))
        out += Data("data".utf8) + le(UInt32(pcm.count)) + pcm
        return out
    }
}
