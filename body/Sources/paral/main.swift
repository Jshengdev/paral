import AppKit
import ParalBody

/// The real body: thin hosts for the key, the microphone, the picture of the screen, the speaker and the window.
/// What is shown is decided by the same scene and drawn by the same painter the films use.
final class App: NSObject, NSApplicationDelegate {
    private let wire: Wire
    private var painter: Painter
    private let tokensPath: String
    private var tokensChanged: Date?
    private let screen: NSScreen
    private var scene: Scene
    private var overlay: Overlay?
    private let mic = Mic()
    private let speaker = Speaker()
    private var key: Key?
    /// What the mind sets, from its ready line. The key is armed only after that line, so every "?? value" below is
    /// a fallback that cannot fire, and each repeats the setting's own value.
    private var settings: BodySettings?
    private var status: NSStatusItem?
    private var voiced: Set<String> = []
    private var shot: (image: CGImage, place: DisplayPlace, lines: [ReadLine])?
    private var trail: [CGPoint] = []
    private var cut: Set<String> = []
    private var holds = 0
    /// True from the key going down until that hold has ended. The watch does not look meanwhile.
    private var held = false
    /// Ends each hold: the microphone closes and the mind is told when the key came up.
    private lazy var release = Release { [weak self] released in
        self?.mic.stop()
        self?.wire.send(.keyUp(at: released))
        self?.held = false
    }
    /// Looks at the display with no key pressed, when the mind asks for it in its ready line.
    private lazy var watch = Watch(screen: screen)
    private let began = Date()

    init(socket: String, tokens: Tokens, tokensPath: String, screen: NSScreen) {
        self.tokensPath = tokensPath
        wire = Wire(path: socket)
        self.screen = screen
        let size = screen.frame.size
        scene = Scene(width: size.width, height: size.height, tokens: tokens)
        scene.reduceMotion = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        painter = Painter(tokens: tokens, width: size.width, height: size.height)
    }

    private func clock() -> Double { Date().timeIntervalSince(began) * 1000 }
    private func stamp() -> Double { (Date().timeIntervalSince1970 * 1000).rounded() }
    private func tell(_ seen: Seen) { scene.take(seen, at: clock()) }
    private func failed(_ why: String) { tell(.state(name: "failed", detail: why)) }

    func applicationDidFinishLaunching(_ note: Notification) {
        overlay = Overlay(screen: screen, painter: painter) { [unowned self] in self.scene.picture(at: self.clock()) }
        overlay?.onClose = { [weak self] in self?.close() }
        let watch = Timer(timeInterval: 0.5, repeats: true) { [weak self] _ in self?.reloadTokens() }
        RunLoop.main.add(watch, forMode: .common)
        let status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        status.button?.title = "paral"
        let menu = NSMenu()
        menu.addItem(withTitle: "Close this conversation", action: #selector(close), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Quit paral", action: #selector(quit), keyEquivalent: "q").target = self
        status.menu = menu
        self.status = status

        mic.onSound = { [weak self] sound in
            guard let self else { return }
            self.wire.send(.mic(pcm: sound, at: self.stamp()))
        }
        mic.onFailed = { [weak self] why in self?.failed(why) }
        wire.onLine = { [weak self] seen in self?.took(seen) }
        wire.onRefused = { [weak self] why in self?.failed("the body refused a line from the mind (\(why))") }
        wire.onUp = { [weak self] up in if !up { self?.failed("the mind is not running; start it with ./run") } }
        Mic.ask { [weak self] allowed in if !allowed { self?.failed(Mic.off) } }
        if !Screen.allowed { Screen.ask() }
        wire.start()
    }

    /// The look is one file. When it changes on disk (the dials page saves it), the scene and the painter take the new one.
    private func reloadTokens() {
        let changed = (try? FileManager.default.attributesOfItem(atPath: tokensPath))?[.modificationDate] as? Date
        guard let changed, changed != tokensChanged else { return }
        defer { tokensChanged = changed }
        guard tokensChanged != nil, let tokens = try? Tokens.load(tokensPath) else { return }
        scene.tokens = tokens
        painter = Painter(tokens: tokens, width: painter.width, height: painter.height)
        overlay?.painter = painter
        overlay?.repaint()
    }

    private func took(_ seen: Seen) {
        if case .ready(let settings) = seen, key == nil {
            self.settings = settings
            guard let which = Key.Which(rawValue: settings.holdKey) else { return failed("unknown hold key \"\(settings.holdKey)\"") }
            let key = Key(which)
            key.onDown = { [weak self] in self?.down() }
            key.onUp = { [weak self] in self?.up() }
            key.onHeld = { [weak self] in self?.draw() }
            key.start()
            self.key = key
            watch.busy = { [weak self] in self?.held ?? true }
            watch.onLook = { [weak self] path, w, h, place, lines in
                guard let self else { return }
                self.tell(.screen(display: place, lines: lines))
                self.wire.send(.look(at: self.stamp(), display: place, path: path, w: w, h: h, lines: lines))
            }
            watch.start(everyMs: settings.lookEveryMs, longEdge: settings.pictureLongEdge)
        }
        if case .voice(let id, _, let sound, _) = seen {
            guard !cut.contains(id) else { return }
            voiced.insert(id)
            speaker.play(sound)
        }
        if case .open(let path) = seen, !Keep.open(path) { failed("the calendar file could not be opened") }
        tell(seen)
    }

    /// Stops the voice, and drops any sound of the same answers that is still on its way.
    private func hush() {
        speaker.stop()
        cut.formUnion(voiced)
    }

    private func down() {
        // A press inside the grace of the hold before ends that hold first, so its key-up goes out ahead of this key-down.
        release.now()
        hush()
        shot = nil
        trail = []
        holds += 1
        held = true
        let mine = holds
        tell(.keyDown)
        wire.send(.keyDown(at: stamp()))
        // A missing grant is said on every press, in the capsule, since that is where he is looking.
        if !Mic.allowed { failed(Mic.off) }
        mic.start()
        Task { [weak self] in
            guard let self else { return }
            do {
                let (image, place) = try await Screen.picture(of: self.screen)
                let lines = try Screen.read(image)
                await MainActor.run {
                    // A picture that comes back after he has pressed again belongs to the press before, and is dropped.
                    guard mine == self.holds else { return }
                    self.shot = (image, place, lines)
                    self.tell(.screen(display: place, lines: lines))
                    self.sendShot()
                }
            } catch {
                let why = (error as? Screen.Failed)?.why ?? error.localizedDescription
                await MainActor.run { self.failed(Screen.allowed ? "the screen could not be read (\(why))" : Screen.off) }
            }
        }
    }

    /// With the draw key also down, the pointer is a pen: each look adds a point to his path.
    private func draw() {
        guard let name = settings?.drawKey, let pen = Key.Which(rawValue: name), Key.isDown(pen), let at = Key.pointer else { return }
        if let last = trail.last, abs(last.x - at.x) < 1, abs(last.y - at.y) < 1 { return }
        trail.append(at)
        tell(.trail(x: at.x, y: at.y))
        wire.send(.trail(x: at.x, y: at.y, at: stamp()))
    }

    /// Sends the picture of this ask to the mind, with his path on it when he drew one. Sent again if he draws after the first one went.
    private func sendShot() {
        guard let shot else { return }
        let path = NSTemporaryDirectory() + "paral-screen.jpg"
        // When he drew around something, the answer's picture is only that part, with the words of the lines in it.
        // The whole page went to the mind earlier, when the key went down and no path was drawn yet.
        let part = trail.count > 1
            ? Screen.around(shot.image, lines: shot.lines, path: trail, on: shot.place, share: settings?.cropShare ?? 1, points: settings?.cropPoints ?? 200, color: painter.accent, width: painter.tokens.mark.width + 1)
            : (image: shot.image, lines: shot.lines)
        do {
            try Screen.saveSmaller(part.image, to: path, longEdge: settings?.pictureLongEdge ?? 1280)
            wire.send(.screen(at: stamp(), display: shot.place, path: path, w: shot.image.width, h: shot.image.height, lines: part.lines))
        } catch {
            failed("the picture could not be saved (\((error as? Screen.Failed)?.why ?? error.localizedDescription))")
        }
    }

    private func up() {
        let released = stamp()
        tell(.keyUp)
        if trail.count > 1 { sendShot() }
        // The microphone stays open for the ear's grace after the release, so his last word is heard.
        release.letGo(at: released, graceMs: settings?.earGraceMs ?? 0)
    }

    @objc private func close() {
        hush()
        tell(.close)
        wire.send(.close(at: stamp()))
    }

    @objc private func quit() { NSApp.terminate(nil) }
}

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
app.run()
