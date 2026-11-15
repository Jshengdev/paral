import AppKit

extension Painter {
    static let waitingGap = 12.0

    /// Three chalk dots that brighten in turn: something is on its way. The capsule shows them while it thinks, and
    /// an empty card while its board is being made.
    func waiting(at centre: CGPoint, clock: Double, in colour: CGColor? = nil, _ ctx: CGContext) {
        let paper = colour ?? self.paper
        for dot in 0..<3 {
            let alpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(clock / 180 - Double(dot) * 0.9))
            ctx.setFillColor(paper.copy(alpha: alpha) ?? paper)
            ctx.fillEllipse(in: CGRect(x: centre.x + Double(dot - 1) * Painter.waitingGap - 3, y: centre.y - 3, width: 6, height: 6))
        }
    }

    /// A light card of boxes joined by arrows, one row at a time, in the design kit's language: the card is the kit's
    /// light surface, a box is its quiet button (mist, written in ink), and on a board of steps the row he is on is
    /// its main button (ink, written in white). Words that are too long for the card's widest
    /// wrap onto more lines inside their box at full size; only a card that is still too large for its room is
    /// shrunk, words and all. With no rows yet it is an empty card with the waiting dots in it; when the rows come the
    /// card grows from that size to theirs and they fade in. The others stay as they are. Gives back the card's box, the lit
    /// row's, and the size the words were drawn at.
    func board(_ board: BoardPicture, clock: Double, _ ctx: CGContext) -> (card: Box, lit: Box?, type: Double) {
        let b = tokens.board
        let chalk = ink
        let wrapped: NSString.DrawingOptions = [.usesLineFragmentOrigin, .usesFontLeading]
        // The widest the words of one row may run: the card at its widest, or the room when that is narrower, less
        // the card's own edge. The boxes of a row share it.
        let widest = min(board.room.w, b.maxWidth) - 2 * b.pad
        let sized = board.rows.enumerated().map { index, row in row.map { text -> (NSAttributedString, CGSize) in
            let label = inked(text, size: b.type, color: index == board.now ? paper : ink, weight: .medium)
            let share = max((widest - b.gap * Double(row.count - 1)) / Double(row.count) - 2 * b.boxPadX, 4 * b.type)
            let size = label.boundingRect(with: CGSize(width: share, height: .greatestFiniteMagnitude), options: wrapped).size
            return (label, CGSize(width: size.width.rounded(.up), height: size.height.rounded(.up)))
        } }
        let rowHeights = sized.map { row in (row.map { $0.1.height }.max() ?? b.type) + 2 * b.boxPadY }
        let rowWidths = sized.map { row in row.reduce(0) { $0 + $1.1.width + 2 * b.boxPadX } + b.gap * Double(max(0, row.count - 1)) }
        let fullW = (rowWidths.max() ?? 0) + 2 * b.pad
        let fullH = rowHeights.reduce(0, +) + Double(max(0, sized.count - 1)) * b.rowGap + 2 * b.pad
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
        surface(card, ctx)
        if sized.isEmpty { waiting(at: CGPoint(x: cardW / 2, y: cardH / 2), clock: clock, in: ink, ctx) }
        // The rows are laid out for the full card and shown through the card as it grows.
        ctx.addPath(card)
        ctx.clip()
        ctx.setAlpha(board.appear * grown)
        ctx.translateBy(x: (cardW - fullW) / 2, y: (cardH - fullH) / 2)
        ctx.setStrokeColor(chalk.copy(alpha: 0.9) ?? chalk)
        ctx.setLineWidth(1.5)
        ctx.setLineCap(.round)
        var y = b.pad
        var lit: Box?
        // Where a place in the rows' own space is on the display, for the lit row's box.
        let rowsAt = CGPoint(x: origin.x + (cardW - fullW) / 2 * scale, y: origin.y + (cardH - fullH) / 2 * scale)
        for (index, row) in sized.enumerated() where index < board.shown {
            var x = (fullW - rowWidths[index]) / 2
            let boxHeight = rowHeights[index]
            if index == board.now { lit = Box(x: rowsAt.x + x * scale, y: rowsAt.y + y * scale, w: rowWidths[index] * scale, h: boxHeight * scale) }
            for (cell, (label, size)) in row.enumerated() {
                let boxW = size.width + 2 * b.boxPadX
                // Writing a label leaves its own colour as the pen's, so the pen is set again for every box and arrow.
                ctx.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: boxW, height: boxHeight), cornerWidth: min(12, boxHeight / 2), cornerHeight: min(12, boxHeight / 2), transform: nil))
                ctx.setFillColor(index == board.now ? ink : mist)
                ctx.fillPath()
                label.draw(with: CGRect(x: x + b.boxPadX, y: y + (boxHeight - size.height) / 2, width: size.width, height: size.height), options: wrapped)
                x += boxW
                if cell < row.count - 1 {
                    ctx.setStrokeColor(chalk.copy(alpha: 0.6) ?? chalk)
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
        return (Box(x: origin.x, y: origin.y, w: w, h: h), lit, b.type * scale)
    }
}
