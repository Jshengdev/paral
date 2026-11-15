import AppKit

extension Painter {
    /// Only the guide's card of a picture, and the drawn arrow when it leads to that card, each where painting the
    /// whole picture put it: `placed` is what `paint` gave back for the same picture, painted with `leavesOutGuide`.
    /// For the window that shows them on his screen and is left out of a recording (`GuideWindow.swift`).
    public func guide(of picture: Picture, placed: [Drawn], into ctx: CGContext) {
        guard let guide = picture.guide else { return }
        var alone = self
        alone.inset = picture.bottomInset
        alone.leavesOutGuide = false
        let before = NSGraphicsContext.current
        NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)
        defer { NSGraphicsContext.current = before }
        let up = placed.filter { Painter.underGuide.contains($0.what) }.map(\.box)
        _ = alone.guide(guide, avoiding: picture.avoid + up, ctx)
        guard picture.lead?.to == .guide else { return }
        var with = picture
        with.pointer = picture.pointer.map(inside)
        _ = alone.lead(with, placed: placed, ctx)
    }
}
