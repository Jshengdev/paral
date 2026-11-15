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

// The system's image library reads the program's bundle information the first time it is used, and so does the
// network library on its own thread. Once, under load, the two met and this program crashed inside that first read
// (2026-11-14, one run in several hundred). Reading it here first, before any other thread exists, is a guess at
// the cure; it costs nothing.
_ = Bundle.main.infoDictionary

let usage = "usage: read PICTURE | smaller PICTURE OUT.jpg LONG_EDGE | same PICTURE PICTURE | rounds ROUNDS.json | page OUT.png LINE... | lines | keys SECONDS rightOption|fn|controlOption | flow FLOW.json SOCKET TOKENS.json | film RUN_DIR TOKENS.json | frame RUN_DIR TOKENS.json MS OUT.png | capsule RUN_DIR TOKENS.json MS... | placed RUN_DIR TOKENS.json MS... | apart RUN_DIR TOKENS.json MS MARGIN | usc ADDRESS... | curves TOKENS.json SHARE..."
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

case "same":
    // Whether two pictures look the same to the watcher, which reads a picture's text only when they do not.
    guard arguments.count == 3 else { fail(usage) }
    do {
        out(["same": Screen.alike(Screen.print(try Screen.load(arguments[1])), Screen.print(try Screen.load(arguments[2])), within: Watch.within)])
    } catch { fail(why(error)) }

case "rounds":
    // What the watcher decides for a row of rounds, each a print given as letters (one letter is one point's grey).
    guard arguments.count == 2, let data = FileManager.default.contents(atPath: arguments[1]), let asked = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let most = asked["most"] as? Int, let within = asked["within"] as? Double, let given = asked["rounds"] as? [[String: Any]] else { fail(usage) }
    var rounds = Rounds()
    out(["reported": given.map { rounds.report(Data(($0["print"] as? String ?? "").utf8), waiting: $0["waiting"] as? Bool ?? false, most: most, within: within) }])

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

case "capsule":
    guard arguments.count >= 4 else { fail(usage) }
    do {
        let shown = try Film.capsule(run: arguments[1], tokens: try Tokens.load(arguments[2]), at: arguments.dropFirst(3).compactMap(Double.init))
        out(shown.map { ["look": $0.look, "note": $0.note ?? ""] })
    } catch { fail(why(error)) }

case "placed":
    guard arguments.count >= 4 else { fail(usage) }
    // PARAL_GUIDE=off stands for the menu's "Show the guide" unticked, which no line of a record carries;
    // PARAL_INSET for the points of the display's foot a Dock takes, which a record has none of; and PARAL_NOT_NOW
    // for the moments he pressed "Not now" on the nudge card (ms, by commas), which no line carries either.
    let told = ProcessInfo.processInfo.environment, notNow = (told["PARAL_NOT_NOW"] ?? "").split(separator: ",").compactMap { Double($0) }
    do { out(try Film.placed(run: arguments[1], tokens: try Tokens.load(arguments[2]), at: arguments.dropFirst(3).compactMap(Double.init), guide: told["PARAL_GUIDE"] != "off", inset: Double(told["PARAL_INSET"] ?? "") ?? 0, notNow: notNow)) } catch { fail(why(error)) }

case "apart":
    // One moment painted as the app paints it: the overlay without the guide's card, and the card alone.
    guard arguments.count == 5, let moment = Double(arguments[3]), let margin = Double(arguments[4]) else { fail(usage) }
    do { out(try Film.apart(run: arguments[1], tokens: try Tokens.load(arguments[2]), at: moment, margin: margin)) } catch { fail(why(error)) }

case "usc":
    // Whether the app would open each address in his browser (`Keep.usc`), for rows.
    out(arguments.dropFirst().map { Keep.usc($0) != nil })

case "curves":
    // Each of the four curves at the given shares of its time, for rows.
    guard arguments.count >= 3, let curves = try? Tokens.load(arguments[1]).curves else { fail(usage) }
    let shares = arguments.dropFirst(2).compactMap(Double.init)
    out(["arrive": shares.map { curves.arrive($0) }, "travel": shares.map { curves.travel($0) }, "leave": shares.map { curves.leave($0) }, "pop": shares.map { curves.pop($0) }])

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
