import Foundation

/// Where things go on a display, in points from its top-left corner.
public enum Layout {
    public static func capsule(open: Double, closes: Bool = false, width: Double, height: Double, tokens: Tokens) -> Box {
        let c = tokens.capsule
        let rest = closes ? c.restClose : c.rest
        let w = rest + (min(c.width, width - 48) - rest) * open
        let h = rest + (c.height - rest) * open
        return Box(x: (width - w) / 2, y: height - c.bottom - c.height / 2 - h / 2, w: w, h: h)
    }

    /// The largest empty rectangle left by the page's text and the capsule, found on a coarse grid.
    public static func room(texts: [Box], width: Double, height: Double, tokens: Tokens) -> Box {
        let cell = 24.0, margin = tokens.board.margin
        let cols = Int(width / cell), rows = Int(height / cell)
        guard cols > 2, rows > 2 else { return Box(x: 0, y: 0, w: max(width, 1), h: max(height, 1)) }
        let taken = texts.map { $0.grown(margin) } + [capsule(open: 1, width: width, height: height, tokens: tokens).grown(margin)]
        func free(_ col: Int, _ row: Int) -> Bool {
            if col == 0 || row == 0 || col == cols - 1 || row == rows - 1 { return false }
            let x = Double(col) * cell, y = Double(row) * cell
            return !taken.contains { $0.x < x + cell && x < $0.x + $0.w && $0.y < y + cell && y < $0.y + $0.h }
        }
        var heights = [Int](repeating: 0, count: cols)
        var best = (area: 0, col: 1, row: 1, w: 1, h: 1)
        for row in 0..<rows {
            for col in 0..<cols { heights[col] = free(col, row) ? heights[col] + 1 : 0 }
            var stack: [Int] = []
            for col in 0...cols {
                let tall = col < cols ? heights[col] : 0
                while let top = stack.last, heights[top] >= tall {
                    stack.removeLast()
                    let left = (stack.last ?? -1) + 1
                    let w = col - left, h = heights[top]
                    if w * h > best.area { best = (w * h, left, row - h + 1, w, h) }
                }
                stack.append(col)
            }
        }
        return Box(x: Double(best.col) * cell, y: Double(best.row) * cell, w: Double(best.w) * cell, h: Double(best.h) * cell)
    }
}
