import AppKit

extension Painter {
    static let waitingGap = 12.0

    /// Three chalk dots that brighten in turn: something is on its way. The capsule shows them while it thinks, and
    /// an empty card while its board is being made.
    func waiting(at centre: CGPoint, clock: Double, _ ctx: CGContext) {
        for dot in 0..<3 {
            let alpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(clock / 180 - Double(dot) * 0.9))
            ctx.setFillColor(paper.copy(alpha: alpha) ?? paper)
            ctx.fillEllipse(in: CGRect(x: centre.x + Double(dot - 1) * Painter.waitingGap - 3, y: centre.y - 3, width: 6, height: 6))
        }
    }

    /// A dark card of chalk boxes joined by arrows, one row at a time, shrunk to fit the room it was given. With no
    /// rows yet it is an empty card with the waiting dots in it; when the rows come the card grows from that size
    /// to theirs and they fade in.
    func board(_ board: BoardPicture, clock: Double, _ ctx: CGContext) -> Box {
        let b = tokens.board
        let chalk = paper
        let sized = board.rows.map { row in row.map { text -> (NSAttributedString, CGSize) in
            let label = inked(text, size: b.type, color: chalk, weight: .medium)
            return (label, label.size())
        } }
        let boxHeight = (sized.flatMap { $0 }.map { $0.1.height }.max() ?? b.type) + 2 * b.boxPadY
        let rowWidths = sized.map { row in row.reduce(0) { $0 + $1.1.width + 2 * b.boxPadX } + b.gap * Double(max(0, row.count - 1)) }
        let fullW = (rowWidths.max() ?? 0) + 2 * b.pad
        let fullH = Double(sized.count) * boxHeight + Double(max(0, sized.count - 1)) * b.rowGap + 2 * b.pad
        let grown = sized.isEmpty ? 0 : min(max(board.filled, 0), 1)
        let cardW = b.emptyWidth + (fullW - b.emptyWidth) * grown
        let cardH = b.emptyHeight + (fullH - b.emptyHeight) * grown
        let scale = min(1, board.room.w / cardW, board.room.h / cardH, b.maxWidth / cardW)
        let w = cardW * scale, h = cardH * scale
        let origin = CGPoint(x: board.room.x + (board.room.w - w) / 2, y: board.room.y + (board.room.h - h) / 2)

        ctx.saveGState()
        ctx.setAlpha(board.appear)
        ctx.translateBy(x: origin.x, y: origin.y)
        ctx.scaleBy(x: scale, y: scale)
        let card = CGPath(roundedRect: CGRect(x: 0, y: 0, width: cardW, height: cardH), cornerWidth: b.radius, cornerHeight: b.radius, transform: nil)
        ctx.addPath(card)
        ctx.setFillColor(ink.copy(alpha: 0.96) ?? ink)
        ctx.fillPath()
        if sized.isEmpty { waiting(at: CGPoint(x: cardW / 2, y: cardH / 2), clock: clock, ctx) }
        // The rows are laid out for the full card and shown through the card as it grows.
        ctx.addPath(card)
        ctx.clip()
        ctx.setAlpha(board.appear * grown)
        ctx.translateBy(x: (cardW - fullW) / 2, y: (cardH - fullH) / 2)
        ctx.setStrokeColor(chalk.copy(alpha: 0.9) ?? chalk)
        ctx.setLineWidth(1.5)
        ctx.setLineCap(.round)
        var y = b.pad
        for (index, row) in sized.enumerated() where index < board.shown {
            var x = (fullW - rowWidths[index]) / 2
            for (cell, (label, size)) in row.enumerated() {
                let boxW = size.width + 2 * b.boxPadX
                ctx.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: boxW, height: boxHeight), cornerWidth: 8, cornerHeight: 8, transform: nil))
                ctx.strokePath()
                label.draw(at: CGPoint(x: x + b.boxPadX, y: y + (boxHeight - size.height) / 2))
                x += boxW
                if cell < row.count - 1 {
                    let mid = y + boxHeight / 2, from = x + 7, to = x + b.gap - 7
                    ctx.move(to: CGPoint(x: from, y: mid))
                    ctx.addLine(to: CGPoint(x: to, y: mid))
                    ctx.move(to: CGPoint(x: to - 6, y: mid - 5))
                    ctx.addLine(to: CGPoint(x: to, y: mid))
                    ctx.addLine(to: CGPoint(x: to - 6, y: mid + 5))
                    ctx.strokePath()
                    x += b.gap
                }
            }
            y += boxHeight + b.rowGap
        }
        ctx.restoreGState()
        return Box(x: origin.x, y: origin.y, w: w, h: h)
    }
}
