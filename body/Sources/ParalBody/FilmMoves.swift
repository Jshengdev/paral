import Foundation

/// His own pointer in a recorded run. A scripted run writes each sight of it the scene kept to `pointer.jsonl` beside
/// the record, one line a sight, `{"at": STAMP, "x": X, "y": Y}` with the body's own clock (ms since 1970) and display
/// points; it is not in the record, since none of it crosses the seam. The film carries the stamps over to the
/// record's clock by way of the first line of the body's in the record that carries one, as it does a release.
extension Film {
    /// The lines of a file a scripted run kept beside the record, each with its `at` carried over to the record's clock.
    static func beside(_ dir: URL, _ name: String) throws -> [[String: Any]] {
        guard let written = try? String(contentsOf: dir.appendingPathComponent(name), encoding: .utf8) else { return [] }
        func rows(_ text: String) -> [[String: Any]] { text.split(separator: "\n").compactMap { try? JSONSerialization.jsonObject(with: Data($0.utf8)) as? [String: Any] } }
        let record = rows(try String(contentsOf: dir.appendingPathComponent("session.jsonl"), encoding: .utf8))
        // The record's clock less the body's, from the first line the body stamped.
        let shift = record.lazy.compactMap { row -> Double? in
            guard row["from"] as? String != "mind", let at = (row["at"] as? NSNumber)?.doubleValue, let stamp = ((row["line"] as? [String: Any])?["at"] as? NSNumber)?.doubleValue else { return nil }
            return at - stamp
        }.first ?? 0
        return rows(written).compactMap { row in (row["at"] as? NSNumber).map { row.merging(["at": $0.doubleValue + shift] as [String: Any]) { $1 } } }
    }

    static func moves(_ dir: URL) throws -> [(x: Double, y: Double, at: Double)] {
        try beside(dir, "pointer.jsonl").compactMap { row in
            guard let at = row["at"] as? Double, let x = (row["x"] as? NSNumber)?.doubleValue, let y = (row["y"] as? NSNumber)?.doubleValue else { return nil }
            return (x, y, at)
        }.sorted { $0.at < $1.at }
    }

    /// His drags of a board by its strip, which a scripted run writes to `drags.jsonl` beside the record (`FlowDrag.swift`).
    static func drags(_ dir: URL) throws -> [(id: String, dx: Double, dy: Double, began: Bool, at: Double)] {
        try beside(dir, "drags.jsonl").compactMap { row in
            guard let at = row["at"] as? Double, let id = row["id"] as? String, let dx = (row["dx"] as? NSNumber)?.doubleValue, let dy = (row["dy"] as? NSNumber)?.doubleValue else { return nil }
            return (id, dx, dy, row["began"] as? Bool ?? false, at)
        }.sorted { $0.at < $1.at }
    }
}

extension Film.Loaded {
    /// A scene for this run, which knows every sight of his pointer and every drag of a board from the start: it
    /// reads only those up to the moment it is asked about, as the live scene has only those.
    func scene(_ tokens: Tokens, inset: Double = 0) -> Scene {
        var scene = Scene(width: w, height: h, tokens: tokens, bottomInset: inset)
        scene.his.kept = moves
        scene.drags = drags
        return scene
    }
}
