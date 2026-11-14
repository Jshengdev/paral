import AppKit
import ParalBody

func out(_ value: Any) {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    print(String(decoding: data, as: UTF8.self))
}

func fail(_ why: String) -> Never {
    FileHandle.standardError.write(Data("paral-headless: \(why)\n".utf8))
    exit(2)
}

func why(_ error: Error) -> String {
    (error as? Screen.Failed)?.why ?? (error as? Flow.Failed)?.why ?? error.localizedDescription
}

let usage = "usage: read PICTURE | smaller PICTURE OUT.jpg LONG_EDGE | page OUT.png LINE... | lines | keys SECONDS rightOption|fn|controlOption | flow FLOW.json SOCKET TOKENS.json | film RUN_DIR TOKENS.json | frame RUN_DIR TOKENS.json MS OUT.png"
let arguments = Array(CommandLine.arguments.dropFirst())

switch arguments.first {
case "read":
    guard arguments.count == 2 else { fail(usage) }
    do {
        let image = try Screen.load(arguments[1])
        let began = Date()
        let lines = try Screen.read(image)
        out(["w": image.width, "h": image.height, "ms": (Date().timeIntervalSince(began) * 1000).rounded(), "lines": lines.map { ["text": $0.text, "box": $0.box.json] }])
    } catch { fail(why(error)) }

case "smaller":
    guard arguments.count == 4, let edge = Double(arguments[3]) else { fail(usage) }
    do {
        try Screen.saveSmaller(try Screen.load(arguments[1]), to: arguments[2], longEdge: edge)
        let small = try Screen.load(arguments[2])
        let bytes = (try FileManager.default.attributesOfItem(atPath: arguments[2])[.size] as? Int) ?? 0
        out(["w": small.width, "h": small.height, "bytes": bytes])
    } catch { fail(why(error)) }

case "page":
    guard arguments.count >= 3 else { fail(usage) }
    do { out(try Page.draw(lines: Array(arguments.dropFirst(2)), to: arguments[1])) } catch { fail(why(error)) }

case "lines":
    while let text = readLine() {
        switch Seen.read(text) {
        case .success(let line): print("took \(line)")
        case .failure(let refused): print("refused \(refused.why)")
        }
    }

case "flow":
    guard arguments.count == 4 else { fail(usage) }
    Task { @MainActor in
        do {
            try await Flow(file: arguments[1], socket: arguments[2], tokens: try Tokens.load(arguments[3])).play()
            exit(0)
        } catch { fail(why(error)) }
    }
    dispatchMain()

case "film":
    guard arguments.count == 3 else { fail(usage) }
    do {
        let began = Date()
        let made = try Film.make(run: arguments[1], tokens: try Tokens.load(arguments[2]))
        out(["frames": made.frames, "seconds": (made.seconds * 10).rounded() / 10, "voiceSeconds": (made.voiceSeconds * 10).rounded() / 10, "linesSkipped": made.skipped, "looks": made.looks.map { [$0.at, $0.look] as [Any] }, "tookSeconds": (Date().timeIntervalSince(began) * 10).rounded() / 10])
    } catch { fail(why(error)) }

case "frame":
    guard arguments.count == 5, let moment = Double(arguments[3]) else { fail(usage) }
    do {
        let end = try Film.frame(run: arguments[1], tokens: try Tokens.load(arguments[2]), at: moment, to: arguments[4])
        print("{\"end\":\(Int(end))}")
    } catch {
        fail((error as? Screen.Failed)?.why ?? "\(error)")
    }

case "keys":
    guard arguments.count == 3, let seconds = Double(arguments[1]), let which = Key.Which(rawValue: arguments[2]) else { fail(usage) }
    let key = Key(which)
    key.onDown = { print("down"); fflush(stdout) }
    key.onUp = { print("up"); fflush(stdout) }
    key.start()
    print("watching \(which.rawValue) for \(Int(seconds)) s: hold it and let go")
    fflush(stdout)
    RunLoop.main.run(until: Date().addingTimeInterval(seconds))

default:
    fail(usage)
}
