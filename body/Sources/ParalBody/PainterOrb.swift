import CoreGraphics
import Foundation

extension Painter {
    /// The orb at the bottom centre, in its square of light (`Layout.orb`), at `alpha`: its light worked out
    /// (`OrbLight`) at the pixels the context draws to, two a point on a Retina display and one in a film, so its
    /// dither is as fine on both. Gives back the square, or nil when it is not drawn.
    func orb(_ o: OrbPicture, alpha: Double, _ ctx: CGContext) -> Box? {
        let place = Layout.orb(width: width, height: floor, tokens: tokens)
        guard alpha > 0.01 else { return nil }
        let k = tokens.orb, device = ctx.userSpaceToDeviceSpaceTransform
        let scale = min(max(hypot(device.a, device.b).rounded(), 1), 4)
        let shade = { (hex: String) -> OrbLight.Shade in
            let c = color(hex).components ?? [1, 1, 1]
            return (Float(c[0]), Float(c[1]), Float(c[2]))
        }
        let frame = OrbLight.Frame(time: Float(o.time), phase: Float(o.phase), wobble: Float(o.wobble), levels: Float(k.levels),
                                   cell: Float(k.ditherCell * scale), edge: Float(k.blob), ramp: [k.deep, k.gold, k.pale, k.white].map(shade))
        guard let image = OrbLight.image(side: Int((place.w * scale).rounded()), frame) else { return nil }
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(alpha)
        ctx.interpolationQuality = .none
        // The context is flipped (its origin top-left); a picture is drawn the right way up by flipping it back.
        ctx.translateBy(x: place.x, y: place.y + place.h)
        ctx.scaleBy(x: 1, y: -1)
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: place.w, height: place.h))
        return place
    }
}
