import Foundation

extension Flow {
    /// A step that moves his pointer with no key pressed: `"move": [x, y]` puts it there, and `"move": [[ms, x, y],
    /// ...]` moves it along a path, each point that many ms after the step began, in display points. It is seen sixty
    /// times a second along the way, as the app's key reader sees it, and once more where it stopped; the scene keeps
    /// what it keeps (`SceneFollow.swift`), and each kept sight is written to `pointer.jsonl` beside the record, with
    /// the body's own stamp, for the film. Nothing of it goes to the mind. Then it waits `waitMs`.
    func moved(_ move: Any, waitMs: Double) async throws {
        let path: [[Double]]
        if let at = move as? [NSNumber], at.count == 2 { path = [[0] + at.map(\.doubleValue)] }
        else if let points = move as? [[NSNumber]], !points.isEmpty, points.allSatisfy({ $0.count == 3 }) { path = points.map { $0.map(\.doubleValue) } }
        else { throw Failed(why: "a move is [x, y] or [[ms, x, y], ...]") }
        let file = dir.appendingPathComponent("pointer.jsonl")
        if !FileManager.default.fileExists(atPath: file.path) { FileManager.default.createFile(atPath: file.path, contents: nil) }
        let out = try FileHandle(forWritingTo: file)
        defer { try? out.close() }
        _ = try out.seekToEnd()
        func sight(_ x: Double, _ y: Double) throws {
            guard scene.moved(x: x, y: y, at: clock()) else { return }
            try out.write(contentsOf: Data("{\"at\":\(Int(stamp())),\"x\":\(x),\"y\":\(y)}\n".utf8))
        }
        let began = clock(), look = 1000.0 / 60, last = path[path.count - 1]
        while true {
            let t = clock() - began
            guard t < last[0] else { break }
            // Where the path is at `t`: between the two points either side of it, in a straight line.
            let next = path.firstIndex { $0[0] > t } ?? path.count - 1, before = path[max(next - 1, 0)], after = path[next]
            let share = after[0] > before[0] ? min(max((t - before[0]) / (after[0] - before[0]), 0), 1) : 1
            try sight(before[1] + (after[1] - before[1]) * share, before[2] + (after[2] - before[2]) * share)
            await pause(look)
        }
        try sight(last[1], last[2])
        await pause(look)
        try sight(last[1], last[2])
        await pause(waitMs)
    }
}
