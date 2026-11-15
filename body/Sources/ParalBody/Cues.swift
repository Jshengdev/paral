import AppKit

/// One group of lines he can tap instead of saying them: the group's name, and its lines in order.
public struct Cue: Equatable {
    public var name: String
    public var lines: [String]
    public init(name: String, lines: [String]) { self.name = name; self.lines = lines }
}

/// The cue cards, as items at the top of the menu bar's menu: each group's name, and under it its lines. Tapping a
/// line hands it to `onPick`, which asks it with no voice. It is for a hall too loud for the microphone. The cards
/// come from the mind's ready line; the body keeps no list of its own.
public final class CueMenu: NSObject {
    /// Every item this puts in the menu carries this tag, so it can take its own items out again and no others.
    private static let tag = 4107
    private let onPick: (String) -> Void
    private var shown: [Cue] = []

    public init(onPick: @escaping (String) -> Void) { self.onPick = onPick }

    /// Puts the cards at the top of the menu. The same cards again change nothing; other cards replace them.
    public func show(_ cues: [Cue], in menu: NSMenu?) {
        guard let menu, cues != shown else { return }
        shown = cues
        for old in menu.items where old.tag == CueMenu.tag { menu.removeItem(old) }
        var items: [NSMenuItem] = []
        for cue in cues where !cue.lines.isEmpty {
            let name = NSMenuItem(title: cue.name, action: nil, keyEquivalent: "")
            name.isEnabled = false
            items.append(name)
            for line in cue.lines {
                let item = NSMenuItem(title: line, action: #selector(pick(_:)), keyEquivalent: "")
                item.target = self
                item.indentationLevel = 1
                items.append(item)
            }
        }
        if !items.isEmpty { items.append(.separator()) }
        for (at, item) in items.enumerated() {
            item.tag = CueMenu.tag
            menu.insertItem(item, at: at)
        }
    }

    @objc private func pick(_ item: NSMenuItem) { onPick(item.title) }
}
