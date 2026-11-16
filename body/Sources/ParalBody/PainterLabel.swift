import AppKit

extension Painter {
    /// The small label under the open pill, after the design kit's quiet chip (mist, written in stone, flat): for
    /// the moment after he lets go it says paral is working, and while paral answers it names the key he holds to
    /// talk (`ScenePill.swift` says which). It is not there while he talks or at rest. Where the pill is still
    /// opening (a short hold, or an ask he did not make with the key) it comes in as the pill's surface does, over
    /// the first half of the opening. Gives back its box, or nil while it is not drawn; with no context it is only measured.
    @discardableResult
    func label(_ c: CapsulePicture, _ ctx: CGContext?) -> Box? {
        guard let says = c.label, !says.isEmpty, c.open > 0 else { return nil }
        let k = tokens.capsule
        let text = inked(says, size: k.tagType, color: color(tokens.stone), weight: .medium), size = text.size()
        let box = Layout.label(size: ((Double(size.width) + 2 * k.labelPadX).rounded(.up), (Double(size.height) + 2 * k.labelPadY).rounded(.up)), width: width, height: floor, tokens: tokens)
        guard let ctx else { return box }
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setAlpha(min(1, 2 * c.open))
        ctx.addPath(CGPath(roundedRect: CGRect(x: box.x, y: box.y, width: box.w, height: box.h), cornerWidth: box.h / 2, cornerHeight: box.h / 2, transform: nil))
        ctx.setFillColor(mist)
        ctx.fillPath()
        text.draw(at: CGPoint(x: box.x + (box.w - size.width) / 2, y: box.y + (box.h - size.height) / 2))
        return box
    }
}
