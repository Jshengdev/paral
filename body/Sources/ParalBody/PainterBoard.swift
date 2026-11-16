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
    /// card grows from that size to theirs and they fade in. The others stay as they are. A column (`BoardShape`) is
    /// one box to a row, every box as wide as the widest, each joined to the one under it by an arrow in the gap
    /// between them (`board.downGap`). Words alone are written lines, one to a row from one left edge, at
    /// `board.wordsType` and with no box behind them. Gives back the card's box, the lit row's, the size the words
    /// were drawn at, and for a column each box and each arrow where it was drawn. Every card carries a strip at its
    /// top, a short bar he takes hold of to move the card (`board.strip…`); the band a press takes hold of is the
    /// card's whole width and its top pad, which is given back too. A note (`SceneNotes.swift`) is written in
    /// cardinal at `board.noteType`, as many of its letters as are written so far: beside its box on a column, under
    /// its row on any other board, the card keeping room for all of it from the start. Each note is given back as far
    /// as it is written, and where the writing ends while the pointer rides it.
    func board(_ board: BoardPicture, clock: Double, _ ctx: CGContext) -> (card: Box, lit: Box?, type: Double, boxes: [Box], joins: [Box], strip: Box, notes: [(n: Int, box: Box, says: String)], tip: CGPoint?) {
        let b = tokens.board
        let chalk = ink
        let column = board.shape == .column, written = board.shape == .words
        let between = column ? b.downGap : written ? 0 : b.rowGap, type = written ? b.wordsType : b.type
        let wrapped: NSString.DrawingOptions = [.usesLineFragmentOrigin, .usesFontLeading]
        // The widest the words of one row may run: the card at its widest, or the room when that is narrower, less
        // the card's own edge. The boxes of a row share it.
        let widest = min(board.room.w, b.maxWidth) - 2 * b.pad
        let sized = board.rows.enumerated().map { index, row in row.map { text -> (NSAttributedString, CGSize) in
            let label = inked(text, size: type, color: index == board.now ? paper : ink, weight: .medium)
            let share = max((widest - b.gap * Double(row.count - 1)) / Double(row.count) - 2 * b.boxPadX, 4 * type)
            let size = label.boundingRect(with: CGSize(width: share, height: .greatestFiniteMagnitude), options: wrapped).size
            return (label, CGSize(width: size.width.rounded(.up), height: size.height.rounded(.up)))
        } }
        let rowHeights = sized.map { row in (row.map { $0.1.height }.max() ?? type) + 2 * b.boxPadY }
        let even = column ? sized.compactMap { $0.first?.1.width }.max() : nil
        let rowWidths = sized.map { row in row.reduce(0) { $0 + (even ?? $1.1.width) + 2 * b.boxPadX } + b.gap * Double(max(0, row.count - 1)) }
        let notes = board.notes.filter { $0.row < sized.count }
        let noteSizes = notes.map { inked($0.says, size: b.noteType, color: cardinal, weight: .medium).size() }
        let noteWide = noteSizes.map { Double($0.width) }.max() ?? 0, noteTall = noteSizes.map { Double($0.height) }.max() ?? 0
        let beside = column && !notes.isEmpty ? b.noteGap + noteWide : 0
        let under = sized.indices.map { index in !column && notes.contains { $0.row == index } ? b.noteTop + noteTall : 0 }
        let fullW = max((rowWidths.max() ?? 0) + beside, column ? 0 : noteWide + 2 * b.boxPadX) + 2 * b.pad
        // The card is as tall as the rows shown so far need (an answer's rows come one a sentence), the newest growing
        // in as it comes; it is placed and sized for all of them, so it grows downward and never moves or shrinks.
        func tall(_ rows: Int, _ last: Double = 1) -> Double {
            let heights = rowHeights.prefix(rows).enumerated().map { ($0.offset == rows - 1 ? $0.element * last + between * (last - 1) : $0.element) + under[$0.offset] }
            return heights.reduce(0, +) + Double(max(0, rows - 1)) * between + 2 * b.pad
        }
        let shownCount = min(board.shown, sized.count)
        let fullH = tall(sized.count), shownH = tall(shownCount, shownCount > 1 ? min(max(board.coming, 0), 1) : 1)
        let grown = sized.isEmpty ? 0 : min(max(board.filled, 0), 1)
        let cardW = b.emptyWidth + (fullW - b.emptyWidth) * grown
        let cardH = b.emptyHeight + (shownH - b.emptyHeight) * grown, allH = b.emptyHeight + (fullH - b.emptyHeight) * grown
        let scale = min(1, board.room.w / cardW, board.room.h / allH, b.maxWidth / cardW)
        let w = cardW * scale, h = cardH * scale
        let origin = CGPoint(x: board.room.x + (board.room.w - w) / 2, y: board.room.y + (board.room.h - allH * scale) / 2)

        ctx.saveGState()
        ctx.setAlpha(board.appear)
        ctx.translateBy(x: origin.x, y: origin.y)
        ctx.scaleBy(x: scale, y: scale)
        let card = CGPath(roundedRect: CGRect(x: 0, y: 0, width: cardW, height: cardH), cornerWidth: b.radius, cornerHeight: b.radius, transform: nil)
        surface(card, ctx)
        ctx.addPath(CGPath(roundedRect: CGRect(x: (cardW - b.stripWidth) / 2, y: b.stripTop, width: b.stripWidth, height: b.stripHeight), cornerWidth: b.stripHeight / 2, cornerHeight: b.stripHeight / 2, transform: nil))
        ctx.setFillColor(color(tokens.stone, alpha: b.stripInk))
        ctx.fillPath()
        if sized.isEmpty { waiting(at: CGPoint(x: cardW / 2, y: cardH / 2), clock: clock, in: ink, ctx) }
        // The rows are laid out for the full card and shown through the card as it grows.
        ctx.addPath(card)
        ctx.clip()
        ctx.setAlpha(board.appear * grown)
        ctx.translateBy(x: (cardW - fullW) / 2, y: (cardH - shownH) / 2)
        ctx.setStrokeColor(chalk.copy(alpha: 0.9) ?? chalk)
        ctx.setLineWidth(1.5)
        ctx.setLineCap(.round)
        var y = b.pad
        var lit: Box?, boxes: [Box] = [], joins: [Box] = [], noted: [(n: Int, box: Box, says: String)] = [], tip: CGPoint?
        // Where a place in the rows' own space is on the display, for the lit row's box.
        let rowsAt = CGPoint(x: origin.x + (cardW - fullW) / 2 * scale, y: origin.y + (cardH - shownH) / 2 * scale)
        for (index, row) in sized.enumerated() where index < board.shown {
            var x = written ? b.pad : (fullW - beside - rowWidths[index]) / 2
            let boxHeight = rowHeights[index], left = x
            if index == board.now { lit = Box(x: rowsAt.x + x * scale, y: rowsAt.y + y * scale, w: rowWidths[index] * scale, h: boxHeight * scale) }
            for (cell, (label, size)) in row.enumerated() {
                let boxW = (even ?? size.width) + 2 * b.boxPadX
                // Writing a label leaves its own colour as the pen's, so the pen is set again for every box and arrow.
                if !written {
                    ctx.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: boxW, height: boxHeight), cornerWidth: min(12, boxHeight / 2), cornerHeight: min(12, boxHeight / 2), transform: nil))
                    ctx.setFillColor(index == board.now ? ink : mist)
                    ctx.fillPath()
                }
                label.draw(with: CGRect(x: x + (even == nil ? b.boxPadX : (boxW - size.width) / 2), y: y + (boxHeight - size.height) / 2, width: size.width, height: size.height), options: wrapped)
                if column || (board.growing && !written) { boxes.append(Box(x: rowsAt.x + x * scale, y: rowsAt.y + y * scale, w: boxW * scale, h: boxHeight * scale)) }
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
            // The note of this row, as far as it is written: beside a column's box, or under the row.
            if let n = notes.firstIndex(where: { $0.row == index }) {
                let at = column ? CGPoint(x: x + b.noteGap, y: y + (boxHeight - noteSizes[n].height) / 2) : CGPoint(x: left + b.boxPadX, y: y + boxHeight + b.noteTop)
                let soFar = String(notes[n].says.prefix(notes[n].written))
                let done = inked(soFar, size: b.noteType, color: cardinal, weight: .medium), wide = Double(done.size().width), high = Double(noteSizes[n].height)
                if notes[n].written > 0 {
                    done.draw(at: at)
                    noted.append((n, Box(x: rowsAt.x + at.x * scale, y: rowsAt.y + at.y * scale, w: wide * scale, h: high * scale), soFar))
                }
                if notes[n].riding { tip = CGPoint(x: rowsAt.x + (at.x + wide) * scale, y: rowsAt.y + (at.y + high / 2) * scale) }
            }
            // A column's boxes are joined downward: an arrow from each to the one under it, down its boxes' middle.
            if column, index + 1 < min(board.shown, sized.count) {
                let mid = (fullW - beside) / 2, from = y + boxHeight + 4, to = y + boxHeight + between - 4
                ctx.setStrokeColor(chalk.copy(alpha: 0.6) ?? chalk)
                ctx.move(to: CGPoint(x: mid, y: from))
                ctx.addLine(to: CGPoint(x: mid, y: to))
                ctx.move(to: CGPoint(x: mid - 5, y: to - 6))
                ctx.addLine(to: CGPoint(x: mid, y: to))
                ctx.addLine(to: CGPoint(x: mid + 5, y: to - 6))
                ctx.strokePath()
                joins.append(Box(x: rowsAt.x + (mid - 5) * scale, y: rowsAt.y + from * scale, w: 10 * scale, h: (to - from) * scale))
            }
            y += boxHeight + under[index] + between
        }
        ctx.restoreGState()
        return (Box(x: origin.x, y: origin.y, w: w, h: h), lit, type * scale, boxes, joins, Box(x: origin.x, y: origin.y, w: w, h: min(b.pad * scale, h / 2)), noted, tip)
    }
}
