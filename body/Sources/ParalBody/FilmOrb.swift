import CoreGraphics
import Foundation

extension Film {
    /// The orb's light at the given seconds of a scene with nothing in it, through the scene's own clocks
    /// (`Scene.orb`) and the painter's frame (`OrbLight`), `side` pixels square: what one frame costs, worked out
    /// `times` times over, and for each second what share of the square is lit, whether its corners are clear, the
    /// colour at its middle, how many colours its solid pixels have (the dither's levels and one), and what share of
    /// its pixels differ from the first second's. The last frame is saved to `out`. For rows, and to time it.
    public static func orb(_ tokens: Tokens, side: Int, times: Int, at seconds: [Double], to out: String) -> [String: Any] {
        let scene = Scene(width: 1000, height: 600, tokens: tokens)
        let k = tokens.orb
        let ramp = [k.deep, k.gold, k.pale, k.white].map { hex -> OrbLight.Shade in
            let c = color(hex).components ?? [1, 1, 1]
            return (Float(c[0]), Float(c[1]), Float(c[2]))
        }
        let frames = seconds.map { second -> OrbLight.Frame in
            let o = scene.orb(at: second * 1000)
            return OrbLight.Frame(time: Float(o.time), phase: Float(o.phase), wobble: Float(o.wobble), levels: Float(k.levels), cell: Float(k.ditherCell), edge: Float(k.blob), ramp: ramp)
        }
        guard let first = frames.first else { return [:] }
        let began = Date()
        for _ in 0..<max(times, 1) { _ = OrbLight.pixels(side: side, first) }
        let cost = Date().timeIntervalSince(began) * 1000 / Double(max(times, 1))
        let made = frames.map { OrbLight.pixels(side: side, $0) }
        let facts: [[String: Any]] = zip(seconds, made).map { second, px in
            var lit = 0, colours = Set<UInt32>()
            for i in stride(from: 0, to: px.count, by: 4) where px[i + 3] > 0 {
                lit += 1
                guard px[i + 3] == 255 else { continue }
                colours.insert(UInt32(px[i]) << 16 | UInt32(px[i + 1]) << 8 | UInt32(px[i + 2]))
            }
            let ends: [Int] = [0, side - 1, side * (side - 1), side * side - 1]
            let corners = ends.allSatisfy { px[$0 * 4 + 3] == 0 }
            let m = (side / 2 * side + side / 2) * 4
            var differ = 0
            for i in stride(from: 0, to: px.count, by: 4) where px[i] != made[0][i] || px[i + 3] != made[0][i + 3] { differ += 1 }
            let share = (Double(lit) / Double(side * side) * 100).rounded() / 100, changed = (Double(differ) / Double(side * side) * 100).rounded() / 100
            let middle = String(format: "#%02X%02X%02X", px[m], px[m + 1], px[m + 2])
            let fact: [String: Any] = ["second": second, "lit": share, "cornersClear": corners, "middle": middle, "colours": colours.count, "changed": changed]
            return fact
        }
        if let last = frames.last, let image = OrbLight.image(side: side, last) { try? save(image, to: URL(fileURLWithPath: out)) }
        return ["msPerFrame": (cost * 100).rounded() / 100, "side": side, "frames": facts]
    }
}
