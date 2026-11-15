import AppKit
import ParalBody

// Starts the app: where the mind's socket and the look file are, which display, and then the run loop. The app
// itself is in App.swift.

func fail(_ why: String) -> Never {
    FileHandle.standardError.write(Data("paral: \(why)\n".utf8))
    exit(2)
}

let info = Bundle.main.infoDictionary ?? [:]
let environment = ProcessInfo.processInfo.environment
guard let socket = info["ParalSocket"] as? String ?? environment["PARAL_SOCKET"] else { fail("no socket path; start paral with ./run") }
// The tokens file in the project wins, so the dials page tunes the running app; the copy in the bundle is the fallback.
let bundled = Bundle.main.resourceURL?.appendingPathComponent("tokens.json").path ?? ""
let tokensPath = [info["ParalTokens"] as? String, environment["PARAL_TOKENS"], bundled].compactMap { $0 }.first { FileManager.default.fileExists(atPath: $0) } ?? bundled
guard let tokens = try? Tokens.load(tokensPath) else { fail("the tokens file could not be read at \(tokensPath)") }
let app = NSApplication.shared
guard let screen = NSScreen.main ?? NSScreen.screens.first else { fail("no display found") }
let delegate = App(socket: socket, tokens: tokens, tokensPath: tokensPath, screen: screen)
app.delegate = delegate
app.setActivationPolicy(.accessory)
// A stop from outside (`./run stop`) is not left to end the app in the middle of a look: no new picture is begun, the
// one on its way comes back, and then the app exits (`Screen.end`).
signal(SIGTERM, SIG_IGN)
let stopped = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
stopped.setEventHandler { Screen.end { exit(0) } }
stopped.resume()
app.run()
