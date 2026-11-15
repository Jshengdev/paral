import AppKit

/// The menu's "Show the guide": ticked, the guide's card is drawn; unticked, it is not, for a recording. It is one
/// item at the top of the menu bar's menu. Nothing crosses the seam for it: the mind goes on sending the steps.
public final class GuideSwitch: NSObject {
    /// One for the app, kept alive here, since a menu item does not keep its target.
    public static let shared = GuideSwitch()
    private var onChange: ((Bool) -> Void)?

    /// Puts the item first in the menu, not ticked, and gives the menu back: the guide's card is one more thing on a
    /// page that already has a mark and a card, so it is there only when he asks for it. `onChange` is told at once
    /// that it is off, and each time he ticks or unticks it.
    public func added(to menu: NSMenu, onChange: @escaping (Bool) -> Void) -> NSMenu {
        self.onChange = onChange
        let item = NSMenuItem(title: "Show the guide", action: #selector(flip(_:)), keyEquivalent: "")
        item.target = self
        item.state = .off
        onChange(false)
        menu.insertItem(item, at: 0)
        menu.insertItem(.separator(), at: 1)
        return menu
    }

    @objc private func flip(_ item: NSMenuItem) {
        item.state = item.state == .on ? .off : .on
        onChange?(item.state == .on)
    }
}
