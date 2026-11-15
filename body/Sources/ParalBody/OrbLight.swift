import CoreGraphics
import Foundation

/// The orb's light, after the designer's orb handoff of 2026-11-15 (Lost and Found's own designer, this weekend: her
/// `LFOrb.swift`, a Metal fragment shader, and `orb.html`, the same in WebGL): a dappled light field on a gold ramp,
/// dithered, inside a blobby circle whose edge ripples. Here it is worked out on the CPU, so the film and the window
/// draw the same pixels with the same painter; a Metal view would not be in a film. The formula is hers, step for
/// step (her noise, her warp, her ramp, her ordered dither, her edge); only the place it runs is ours.
public enum OrbLight {
    /// One colour of the ramp, 0 to 1 a channel.
    public typealias Shade = (r: Float, g: Float, b: Float)

    /// What one frame needs: the light field's time, the edge's phase and wobble, how many steps the dither rounds
    /// to, how wide a dither cell is in pixels, how far out the edge sits (a share of the half side), and the ramp
    /// from the deep gold at the rim to white, at 0, 0.4, 0.75 and 1.
    public struct Frame {
        public var time, phase, wobble, levels, cell, edge: Float
        public var ramp: [Shade]
        public init(time: Float, phase: Float, wobble: Float, levels: Float, cell: Float, edge: Float, ramp: [Shade]) {
            (self.time, self.phase, self.wobble, self.levels, self.cell, self.edge, self.ramp) = (time, phase, wobble, levels, cell, edge, ramp)
        }
    }

    private static let bayer: [Float] = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38,
                                         60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
                                         15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map { $0 / 64 }

    @inline(__always) static func fract(_ x: Float) -> Float { x - x.rounded(.down) }
    @inline(__always) static func smooth(_ a: Float, _ b: Float, _ x: Float) -> Float {
        let t = min(max((x - a) / (b - a), 0), 1)
        return t * t * (3 - 2 * t)
    }

    @inline(__always) static func hash(_ x: Float, _ y: Float) -> Float {
        var px = fract(x * 123.34), py = fract(y * 456.21)
        let d = px * (px + 45.32) + py * (py + 45.32)
        px += d
        py += d
        return fract(px * py)
    }

    @inline(__always) static func noise(_ x: Float, _ y: Float) -> Float {
        let ix = x.rounded(.down), iy = y.rounded(.down), fx = x - ix, fy = y - iy
        let ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
        let a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
        let low = a + (b - a) * ux, high = c + (d - c) * ux
        return low + (high - low) * uy
    }

    /// Four octaves of value noise, as hers.
    @inline(__always) static func fbm(_ x: Float, _ y: Float) -> Float {
        var v: Float = 0, a: Float = 0.5, px = x, py = y
        for _ in 0..<4 {
            v += a * noise(px, py)
            px *= 2
            py *= 2
            a *= 0.5
        }
        return v / 0.9375
    }

    /// Where the edge is at the angle `theta`, as a share of the half side: low harmonics and noise, more of both as
    /// `wobble` grows.
    static func edge(_ theta: Float, _ f: Frame) -> Float {
        let p = f.phase
        let rings = 0.05 * sin(3 * theta + p * 6) + 0.035 * sin(5 * theta - p * 9 + 1.3) + 0.025 * sin(8 * theta + p * 4)
        return f.edge + f.wobble * rings + f.wobble * 0.05 * (fbm(cos(theta) * 1.6 + p * 3, sin(theta) * 1.6 + p * 3) - 0.5)
    }

    /// The light at one pixel, 0 to 1 before the dither: the field, brighter toward the middle.
    static func light(_ x: Float, _ y: Float, side: Float, rad: Float, time: Float) -> Float {
        var qx = x / side * 1.6, qy = y / side * 1.6 * 0.42
        qx += time * 0.006
        qy += time * 0.002
        let wx = fbm(qx * 1.7 + 11, qy * 1.7 + 11), wy = fbm(qx * 1.7 + 41, qy * 1.7 + 41)
        let n = fbm(qx * 2.3 + wx * 0.9, qy * 2.3 + wy * 0.9)
        let t = min(max((0.28 * smooth(0.30, 0.46, n) + 0.09 * smooth(0.72, 0.94, n)) / 0.37, 0), 1)
        return min(max(t * 0.78 + (1 - rad * rad) * 0.32, 0), 1)
    }

    /// One frame of the orb, `side` pixels square, premultiplied RGBA, its first row the top. The edge is worked out
    /// at 256 angles a frame and read between them, since it depends on the angle alone; the rest is per pixel.
    public static func pixels(side: Int, _ f: Frame) -> [UInt8] {
        var out = [UInt8](repeating: 0, count: side * side * 4)
        guard side > 0, f.ramp.count == 4 else { return out }
        let steps = 256
        let edges = (0...steps).map { edge(Float($0) / Float(steps) * 2 * .pi - .pi, f) }
        let s = Float(side), half = s / 2, aa: Float = 2.5 / s, levels = max(f.levels, 1), cell = max(f.cell, 1)
        let (deep, gold, pale, white) = (f.ramp[0], f.ramp[1], f.ramp[2], f.ramp[3])
        for row in 0..<side {
            // Her pixels count up from the bottom, with their centres at a half.
            let y = Float(side - 1 - row) + 0.5
            for column in 0..<side {
                let x = Float(column) + 0.5
                let cx = (x - half) / half, cy = (y - half) / half
                let r = (cx * cx + cy * cy).squareRoot(), theta = atan2(cy, cx)
                let at = (theta + .pi) / (2 * .pi) * Float(steps), i = min(Int(at), steps - 1), along = at - Float(i)
                let edge = edges[i] + (edges[i + 1] - edges[i]) * along
                let mask = 1 - smooth(edge - aa, edge + aa, r)
                guard mask > 0 else { continue }
                var v = light(x, y, side: s, rad: min(max(r / edge, 0), 1), time: f.time)
                let bx = Int((x / cell).rounded(.down)) & 7, by = Int((y / cell).rounded(.down)) & 7
                v = (v * levels + bayer[by * 8 + bx]).rounded(.down) / levels
                let (from, to, share) = v < 0.4 ? (deep, gold, v / 0.4) : v < 0.75 ? (gold, pale, (v - 0.4) / 0.35) : (pale, white, (v - 0.75) / 0.25)
                let k = (row * side + column) * 4
                out[k] = UInt8(min(max((from.r + (to.r - from.r) * share) * mask, 0), 1) * 255)
                out[k + 1] = UInt8(min(max((from.g + (to.g - from.g) * share) * mask, 0), 1) * 255)
                out[k + 2] = UInt8(min(max((from.b + (to.b - from.b) * share) * mask, 0), 1) * 255)
                out[k + 3] = UInt8(min(max(mask, 0), 1) * 255)
            }
        }
        return out
    }

    /// The same frame as a picture to draw.
    public static func image(side: Int, _ f: Frame) -> CGImage? {
        let data = Data(pixels(side: side, f)) as CFData
        guard side > 0, let provider = CGDataProvider(data: data) else { return nil }
        return CGImage(width: side, height: side, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: side * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                       bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
    }
}
