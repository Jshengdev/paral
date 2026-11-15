import AppKit

extension Painter {
    /// The logo mark's outline in its own frame of 45 points, as the design kit gives it: a rounded triangle that
    /// points up and to the left. It begins at `logoStart`; each piece after that is where it goes to and, for a
    /// round corner, the two points that pull it.
    private static let logoFrame = 45.0
    private static let logoStart = CGPoint(x: 20.994, y: 34.5151)
    private static let logoPieces: [(to: CGPoint, pulled: (CGPoint, CGPoint)?)] = [
        (CGPoint(x: 34.829, y: 20.6801), nil),
        (CGPoint(x: 32.098, y: 11.2871), (CGPoint(x: 37.941, y: 17.5681), CGPoint(x: 36.394, y: 12.2451))),
        (CGPoint(x: 14.289, y: 7.31208), nil),
        (CGPoint(x: 7.62599, y: 13.9751), (CGPoint(x: 10.298, y: 6.42108), CGPoint(x: 6.73499, y: 9.98408))),
        (CGPoint(x: 11.6, y: 31.7841), nil),
        (CGPoint(x: 20.994, y: 34.5151), (CGPoint(x: 12.559, y: 36.0801), CGPoint(x: 17.882, y: 37.6271))),
    ]
    /// The two strokes that lie under the fill, in the same frame: a black one, and a white one on top of it. Both
    /// are centred on the outline, so outside the fill the white shows 5.6 wide and the black 1 beyond it.
    private static let logoRing = 13.163, logoEdge = 11.163

    /// The logo mark, which is paral's cursor and its face wherever it names itself (the cursor's tag, the guide's
    /// card, the capsule at rest): the kit's rounded triangle filled in cardinal, with a white edge so it reads on
    /// any page and a thin black ring so it reads on white. Drawn here from the kit's outline; no picture is loaded.
    /// `box` is its square frame.
    func logo(in box: CGRect, _ ctx: CGContext) {
        let scale = box.width / Painter.logoFrame
        let place = CGAffineTransform(translationX: box.minX, y: box.minY).scaledBy(x: scale, y: scale)
        let shape = CGMutablePath()
        shape.move(to: Painter.logoStart, transform: place)
        for piece in Painter.logoPieces {
            if let pulled = piece.pulled { shape.addCurve(to: piece.to, control1: pulled.0, control2: pulled.1, transform: place) } else { shape.addLine(to: piece.to, transform: place) }
        }
        shape.closeSubpath()
        ctx.saveGState()
        defer { ctx.restoreGState() }
        ctx.setLineJoin(.round)
        for (colour, wide) in [(CGColor(gray: 0, alpha: 1), Painter.logoRing), (paper, Painter.logoEdge)] {
            ctx.addPath(shape)
            ctx.setStrokeColor(colour)
            ctx.setLineWidth(wide * scale)
            ctx.strokePath()
        }
        ctx.addPath(shape)
        ctx.setFillColor(cardinal)
        ctx.fillPath()
    }

    /// The logo mark in a square of `across`, its middle at `middle`.
    func logo(middle: CGPoint, across: Double, _ ctx: CGContext) {
        logo(in: CGRect(x: middle.x - across / 2, y: middle.y - across / 2, width: across, height: across), ctx)
    }
}
