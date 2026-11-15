import Foundation

/// A tag on the page: a chip of a few words that belongs to a line ("Next", "Done", "7 days left"), in its tone.
public struct TagPicture: Equatable {
    /// Its mark's id and beat, as a mark's key.
    public var key: String
    public var words: String
    public var tone: Tone
    /// The box of the line it belongs to, and where it sits (`Layout.tag`): nil when no place by its line is free,
    /// and then it is not drawn and the film's record says so.
    public var line: Box
    public var box: Box?
    /// How far it has popped out, 0 to 1 and a little past on the way.
    public var grown: Double
}

extension Scene {
    /// When a tag begins to pop out: when it comes, or, when its line has ink of ours that came with it, once the pen
    /// has finished that ink, so the words follow the ink as a note does. At once with motion reduced.
    func arrives(_ tag: Mark) -> Double? {
        guard let began = start(tag) else { return nil }
        guard !still else { return began }
        let ink = marks.filter { $0.kind != .tag && Scene.sameLine($0.box, tag.box) && $0.at <= tag.at + Scene.together && ($0.clearedAt.map { $0 > began } ?? true) }
        return ink.compactMap { mark in start(mark).map { $0 + flight + duration(mark.kind) } }.reduce(began, max)
    }

    /// Every tag on the page at `t`, in the order they came, with its place. Each is placed in that order, clear of
    /// the page's words, of the whole ink of every mark (its own line's ink it sits after), of his loop, of the board
    /// and the clip, of the tags placed before it, and of the pill's band at the foot, which is the pill's alone. The
    /// ink counts whole from the moment its mark is up, so a tag does not move while the pen draws. The cards the
    /// painter places (the guide's, the nudge card, the toast, the way arrow) keep off the tags in their turn.
    func placedTags(at t: Double) -> [(tag: Mark, box: Box?)] {
        func up(_ mark: Mark) -> Bool { mark.at <= t && (mark.clearedAt.map { t < $0 } ?? true) && (start(mark).map { $0 <= t } ?? false) }
        func whole(_ mark: MarkPicture) -> Box? { Painter.bounds(of: Pen.path(of: mark, tokens: tokens, avoiding: texts, inside: (width, height)))?.grown(tokens.mark.width / 2) }
        let ink: [(line: Box, box: Box)] = marks.filter { $0.kind != .tag && up($0) }.compactMap { mark in
            whole(MarkPicture(key: "\(mark.id)/\(mark.beat)", kind: mark.kind, box: mark.box, label: nil, drawn: 1)).map { (mark.box, $0) }
        }
        var echo = self.echo(at: t)
        echo?.drawn = 1
        var taken = [board(at: t)?.room, clip(at: t)?.room, echo.flatMap(whole)].compactMap { $0 } + [Layout.foot(width: width, height: floor, tokens: tokens)]
        var placed: [(tag: Mark, box: Box?)] = []
        for tag in marks where tag.kind == .tag && up(tag) {
            let own = ink.filter { Scene.sameLine($0.line, tag.box) }
            let others = ink.filter { !Scene.sameLine($0.line, tag.box) }.map(\.box)
            let size = Layout.tagSize(tag.label ?? "", tokens: tokens)
            let box = Layout.tag(size: size, line: tag.box, ink: own.map(\.box), texts: texts, taken: taken + others, width: width, height: height, tokens: tokens)
            if let box { taken.append(box) }
            placed.append((tag, box))
        }
        return placed
    }

    /// The tags to draw at `t`: each once its time has come, popping out on `pop` from `chip.from` of its size in
    /// `chip.ms`, as the cursor's name tag does; whole at once with motion reduced.
    func tagsUp(at t: Double) -> [TagPicture] {
        placedTags(at: t).compactMap { tag, box in
            guard let came = arrives(tag), t >= came else { return nil }
            let grown = still ? 1 : tokens.curves.pop((t - came) / max(duration(.tag), 1))
            return TagPicture(key: "\(tag.id)/\(tag.beat)", words: tag.label ?? "", tone: tag.tone ?? .quiet, line: tag.box, box: box, grown: grown)
        }
    }

    /// The most the tags on a line take at `t`, for the cursor to rest clear of them.
    func tags(on line: Box?, at t: Double) -> [Box] {
        guard let line else { return [] }
        return placedTags(at: t).filter { Scene.sameLine($0.tag.box, line) }.compactMap { tag, box in box.map { Layout.tagLargest($0, of: tag.box, tokens: tokens) } }
    }
}
