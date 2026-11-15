import AppKit

/// The demo's centre, in the menu bar's menu: a submenu for each scenario of the bank, with "Open the page" and then
/// its lines to tap instead of saying them, "Start over", and at the foot the last failure. It draws what `Sitting`
/// says and does what a press gives back: a line is handed to `ask`, which asks it with no voice; a page is opened
/// in his browser by the guarded opener (`Keep.go`); "Start over" is handed to `over`. Every item it puts in the
/// menu carries its tag, so it can take its own items out again and no others.
public final class Centre: NSObject {
    private static let tag = 4107
    private static let clock: DateFormatter = { let clock = DateFormatter(); clock.dateFormat = "h:mm:ss a"; return clock }()
    private let ask: (String) -> Void, failed: (String) -> Void, over: () -> Void
    private var sitting = Sitting()
    private var bank: [Cue] = []
    private weak var menu: NSMenu?
    /// The items drawn now that a press can reach, by the number each menu item carries.
    private var pressable: [CentreItem] = []

    public init(ask: @escaping (String) -> Void, failed: @escaping (String) -> Void, over: @escaping () -> Void) {
        (self.ask, self.failed, self.over) = (ask, failed, over)
    }

    /// Puts the centre in the menu, for this bank.
    public func show(_ bank: [Cue], in menu: NSMenu?) {
        (self.bank, self.menu) = (bank, menu)
        redraw()
    }

    /// Everything the scene is told passes here too: a failure becomes the menu's last line, with the time it came.
    public func saw(_ seen: Seen) {
        guard case .state("failed", let detail) = seen else { return }
        sitting.failed(detail ?? "it failed and gave no reason", when: Centre.clock.string(from: Date()))
        redraw()
    }

    private func redraw() {
        guard let menu else { return }
        for old in menu.items where old.tag == Centre.tag { menu.removeItem(old) }
        pressable = []
        let drawn = sitting.menu(bank)
        let top = drawn.scenarios.map(item) + (drawn.scenarios.isEmpty ? [] : [.separator()]) + [item(drawn.startOver), .separator()]
        for (at, item) in top.enumerated() {
            item.tag = Centre.tag
            menu.insertItem(item, at: at)
        }
        guard let failure = drawn.failure else { return }
        for item in [NSMenuItem.separator(), item(failure)] {
            item.tag = Centre.tag
            menu.addItem(item)
        }
    }

    private func item(_ value: CentreItem) -> NSMenuItem {
        let item = NSMenuItem(title: value.title, action: value.does == .nothing ? nil : #selector(pick(_:)), keyEquivalent: "")
        item.target = self
        item.state = value.ticked ? .on : .off
        item.isEnabled = value.enabled
        item.toolTip = value.tip
        item.representedObject = pressable.count
        pressable.append(value)
        if !value.under.isEmpty {
            let under = NSMenu(title: value.title)
            value.under.map(self.item).forEach(under.addItem)
            item.submenu = under
        }
        return item
    }

    @objc private func pick(_ item: NSMenuItem) {
        guard let n = item.representedObject as? Int, pressable.indices.contains(n) else { return }
        let does = sitting.press(pressable[n])
        redraw()
        switch does {
        case .ask(let line): ask(line)
        case .open(let page): if !Keep.go(page) { failed("the page could not be opened (\(page))") }
        case .startOver: over()
        case .nothing: break
        }
    }
}
