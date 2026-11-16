import CoreGraphics
import Foundation

extension Flow {
    /// A step that presses the left button and drags, while the answer goes on: `"drag": {"by": [dx, dy], "overMs":
    /// N, "afterBoardMs": M, "from": "strip"}`. It waits until the board of the newest ask is up and until
    /// `afterBoardMs` after that board's first frame, presses on the middle of the board's strip, moves `by` in a straight line over `overMs`,
    /// seen sixty times a second, and lets go. With `"from": "beside"` the press comes down on the card just under
    /// the strip, where a press takes hold of nothing, and makes the same move. What a press takes hold of is decided
    /// as the app's window decides it (`Overlay.hits`, `Overlay.which`, `Overlay.within`), from the scene painted as
    /// the window paints it, and the scene is told what the window would tell it. Each thing told is also written to
    /// `drags.jsonl` beside the record, with the body's own stamp, for the film. None of it goes to the mind.
    func dragged(_ drag: [String: Any]) async throws {
        guard let by = drag["by"] as? [NSNumber], by.count == 2 else { throw Failed(why: "a drag is {\"by\": [dx, dy]}, with overMs, afterBoardMs and from if wanted") }
        let over = max((drag["overMs"] as? NSNumber)?.doubleValue ?? 1000, 1), after = (drag["afterBoardMs"] as? NSNumber)?.doubleValue ?? 0
        let deadline = clock() + 60_000
        while scene.boardUp(at: clock()) == nil {
            if clock() > deadline { throw Failed(why: "no board came up to drag (waited 60000 ms)") }
            await pause(1000.0 / 60)
        }
        await pause(after - (clock() - (scene.boardUp(at: clock()) ?? clock())))
        let picture = scene.picture(at: clock())
        var placed: [Drawn] = []
        _ = Film.clear(scene.width, scene.height) { placed = Painter(tokens: scene.tokens, width: scene.width, height: scene.height).paint(picture, into: $0) }
        guard let strip = placed.first(where: { $0.what == "strip" })?.box else { throw Failed(why: "the board that is up carries no strip to take hold of") }
        let down = CGPoint(x: strip.x + strip.w / 2, y: drag["from"] as? String == "beside" ? strip.y + strip.h + 6 : strip.y + strip.h / 2)
        let file = dir.appendingPathComponent("drags.jsonl")
        if !FileManager.default.fileExists(atPath: file.path) { FileManager.default.createFile(atPath: file.path, contents: nil) }
        let out = try FileHandle(forWritingTo: file)
        defer { try? out.close() }
        _ = try out.seekToEnd()
        // A press that is on no strip takes hold of nothing, and nothing is told.
        guard case .strip(let id, let card)? = Overlay.which(at: down, of: Overlay.hits(placed, picture)) else { return await pause(over) }
        func tell(_ dx: Double, _ dy: Double, began: Bool) throws {
            let held = Overlay.within(card, dx: dx, dy: dy, width: scene.width, height: scene.height)
            scene.take(.drag(id: id, dx: held.dx, dy: held.dy, began: began), at: clock())
            try out.write(contentsOf: try JSONSerialization.data(withJSONObject: ["at": stamp(), "id": id, "dx": held.dx, "dy": held.dy, "began": began] as [String: Any], options: [.sortedKeys]) + Data("\n".utf8))
        }
        try tell(0, 0, began: true)
        let began = clock()
        while clock() - began < over {
            let share = (clock() - began) / over
            try tell(by[0].doubleValue * share, by[1].doubleValue * share, began: false)
            await pause(1000.0 / 60)
        }
        try tell(by[0].doubleValue, by[1].doubleValue, began: false)
    }

    /// The files a run keeps beside its record (`pointer.jsonl`, `drags.jsonl`) are that run's alone. They are added
    /// to as the run goes, so a run that begins takes away what an earlier run in the same folder left: a film of
    /// the new run would otherwise replay the old run's drags and pointer too, ahead of its own.
    public func begin() {
        for name in ["pointer.jsonl", "drags.jsonl"] { try? FileManager.default.removeItem(at: dir.appendingPathComponent(name)) }
    }
}
