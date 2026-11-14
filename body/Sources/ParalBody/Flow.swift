import Foundation

/// Plays a scripted run against the real mind with no screen, mic or key: the key, the sound of each ask as mic
/// chunks, the pointer's trail, and a picture of the page read by the Mac. It waits the way a person would.
@MainActor
public final class Flow {
    public struct Failed: Error { public let why: String }

    private let wire: Wire
    private let file: [String: Any]
    private let dir: URL
    private var got: [Seen] = []
    private var scene: Scene
    private let tokens: Tokens
    private var settings: BodySettings?
    private var pictureSent = false
    private let began = Date()

    public init(file path: String, socket: String, tokens: Tokens) throws {
        guard let file = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: path))) as? [String: Any],
              let display = file["display"] as? [String: Any], let w = (display["w"] as? NSNumber)?.doubleValue, let h = (display["h"] as? NSNumber)?.doubleValue
        else { throw Failed(why: "the flow file needs display.w and display.h") }
        self.file = file
        dir = URL(fileURLWithPath: path).deletingLastPathComponent()
        scene = Scene(width: w, height: h, tokens: tokens)
        self.tokens = tokens
        wire = Wire(path: socket)
    }

    private func clock() -> Double { Date().timeIntervalSince(began) * 1000 }
    private func stamp() -> Double { (Date().timeIntervalSince1970 * 1000).rounded() }
    private func pause(_ ms: Double) async { try? await Task.sleep(nanoseconds: UInt64(max(ms, 0) * 1_000_000)) }

    private func send(_ line: ToMind, as seen: Seen? = nil) {
        wire.send(line)
        if let seen { scene.take(seen, at: clock()) }
    }

    /// Waits until a line after `from` satisfies `ok`, and returns the index just past it.
    private func until(_ what: String, limit: Double, from: Int, _ ok: (Seen) -> Bool) async throws -> Int {
        let deadline = clock() + limit
        var at = from
        while true {
            while at < got.count {
                at += 1
                if ok(got[at - 1]) { return at }
            }
            if clock() > deadline { throw Failed(why: "the mind never sent \(what) (waited \(Int(limit)) ms)") }
            await pause(5)
        }
    }

    private func settled(from: Int, limit: Double = 90_000) async throws {
        _ = try await until("idle or failed", limit: limit, from: from) { if case .state(let name, _) = $0 { return name == "idle" || name == "failed" } else { return false } }
        while clock() < scene.end { await pause(20) }
    }

    public func play() async throws {
        guard let d = file["display"] as? [String: Any], let page = file["page"] as? String, let asks = file["asks"] as? [[String: Any]] else {
            throw Failed(why: "the flow file needs display, page and asks")
        }
        func number(_ key: String) -> Double { (d[key] as? NSNumber)?.doubleValue ?? 0 }
        let display = DisplayPlace(id: Int(number("id")), scale: max(number("scale"), 1), x: number("x"), y: number("y"))
        wire.onLine = { [weak self] seen in
            guard let self else { return }
            if case .ready(let settings) = seen { self.settings = settings }
            self.got.append(seen)
            self.scene.take(seen, at: self.clock())
        }
        wire.onRefused = { why in FileHandle.standardError.write(Data("flow: refused a line from the mind (\(why))\n".utf8)) }
        wire.start()
        var seenTo = try await until("ready", limit: 8000, from: 0) { if case .ready = $0 { return true } else { return false } }
        let image = try Screen.load(page)
        let small = dir.appendingPathComponent("page-for-the-brain.jpg").path
        try Screen.saveSmaller(image, to: small, longEdge: settings?.pictureLongEdge ?? 2000)

        var first = true
        for ask in asks {
            if !first {
                if let after = ask["startAfter"] as? [String: Any], let plus = (after["firstSayPlusMs"] as? NSNumber)?.doubleValue {
                    _ = try await until("a first sentence", limit: 60_000, from: seenTo) { if case .say = $0 { return true } else { return false } }
                    await pause(plus)
                } else {
                    try await settled(from: seenTo)
                    await pause(500)
                }
            }
            first = false
            if ask["close"] as? Bool == true {
                seenTo = got.count
                send(.close(at: stamp()), as: .close)
                continue
            }
            seenTo = got.count
            let down = clock()
            send(.keyDown(at: stamp()), as: .keyDown)
            let reading = Task.detached { try Screen.read(image) }
            pictureSent = false
            let picture: @MainActor ([ReadLine], String) -> Void = { [weak self] lines, path in
                guard let self, !self.pictureSent else { return }
                self.pictureSent = true
                self.send(.screen(at: self.stamp(), display: display, path: path, w: image.width, h: image.height, lines: lines), as: .screen(display: display, lines: lines))
            }

            var pcm = Data()
            if let wav = ask["wav"] as? String {
                let bytes = try Data(contentsOf: URL(fileURLWithPath: wav))
                guard let data = bytes.range(of: Data("data".utf8)) else { throw Failed(why: "\(wav) is not a WAV file with a data chunk") }
                pcm = bytes.subdata(in: (data.upperBound + 4)..<bytes.count)
            }
            let trail = (ask["trail"] as? [[NSNumber]] ?? []).map { $0.map(\.doubleValue) }.filter { $0.count == 3 }
            // With no circle the picture is the one taken as he starts; with a circle it is taken at the release, the path on it.
            if trail.isEmpty { Task { @MainActor in if let lines = try? await reading.value { picture(lines, small) } } }
            let chunk = 3200, chunkMs = 100.0
            var sent = 0, drawn = 0
            let holdMs = max(Double(pcm.count) / Double(chunk) * chunkMs, trail.last?[0] ?? 0)
            while true {
                let t = clock() - down
                while drawn < trail.count, trail[drawn][0] <= t {
                    send(.trail(x: trail[drawn][1], y: trail[drawn][2], at: stamp()), as: .trail(x: trail[drawn][1], y: trail[drawn][2]))
                    drawn += 1
                }
                while sent < pcm.count, Double(sent / chunk) * chunkMs <= t {
                    wire.send(.mic(pcm: pcm.subdata(in: sent..<min(sent + chunk, pcm.count)), at: stamp()))
                    sent += chunk
                }
                if t >= holdMs { break }
                await pause(8)
            }
            let released = stamp()
            scene.take(.keyUp, at: clock())
            await pause(settings?.earGraceMs ?? 0)
            wire.send(.keyUp(at: released))
            var shown = small
            if trail.count > 1 {
                let path = trail.map { CGPoint(x: $0[1], y: $0[2]) }
                shown = dir.appendingPathComponent("page-with-his-path.jpg").path
                try Screen.saveSmaller(Screen.withPath(image, path, on: display, color: color(tokens.accent), width: tokens.mark.width + 1), to: shown, longEdge: settings?.pictureLongEdge ?? 2000)
            }
            picture(try await reading.value, shown)
        }
        try await settled(from: seenTo)
        await pause(300)
    }
}
