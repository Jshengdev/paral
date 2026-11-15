import Foundation

/// One item of the demo's centre in the menu bar's menu, as plain values: its words, whether it is ticked or greyed
/// out, what a press does, where it sits in the bank, and the items of its submenu. `Centre` draws these; rows read them.
public struct CentreItem: Equatable {
    public enum Does: Equatable { case nothing, open(String), ask(String), startOver }
    public var title: String
    public var ticked = false, enabled = true
    public var does = Does.nothing
    /// The scenario's number in the bank and the line's, nil for its "Open the page": a press makes it the last pressed.
    public var at: Sitting.At?
    public var under: [CentreItem] = []
    /// What shows when the pointer rests on it: the whole of a failure's words.
    public var tip: String?
}

/// The centre's three parts: a submenu for each scenario, "Start over", and the last failure when there was one.
public struct CentreMenu: Equatable {
    public var scenarios: [CentreItem]
    public var startOver: CentreItem
    public var failure: CentreItem?
}

/// What the centre remembers of a sitting: the item of the bank he pressed last, and the last failure and when. It is
/// all "Start over" forgets on the body's side of the menu; the rest of what it forgets is the app's (`App.startOver`).
public struct Sitting: Equatable {
    public struct At: Equatable {
        public var scenario: Int, line: Int?
        public init(scenario: Int, line: Int?) { self.scenario = scenario; self.line = line }
    }
    public struct Failure: Equatable { public var words, when: String }
    public static let opens = "Open the page", greyed = "Open the page (not an https usc.edu address)", over = "Start over"
    /// A failure's words longer than this are cut in the menu; the whole is its tip.
    public static let longest = 90
    public private(set) var pressed: At?
    public private(set) var failure: Failure?

    public init() {}

    /// The menu for a bank. A scenario is its own submenu, ticked when it holds the last pressed item: "Open the page"
    /// first when it has a page (greyed out when the app would not open that address, `Keep.usc`), then its lines in
    /// order, the last pressed one ticked. A scenario with neither page nor lines is left out.
    public func menu(_ bank: [Cue]) -> CentreMenu {
        let scenarios = bank.enumerated().filter { !$0.element.lines.isEmpty || $0.element.page != nil }.map { n, cue in
            var under: [CentreItem] = []
            if let page = cue.page {
                let fine = Keep.usc(page) != nil, at = At(scenario: n, line: nil)
                under.append(CentreItem(title: fine ? Sitting.opens : Sitting.greyed, ticked: pressed == at, enabled: fine, does: fine ? .open(page) : .nothing, at: at))
            }
            under += cue.lines.enumerated().map { i, line in
                let at = At(scenario: n, line: i)
                return CentreItem(title: line, ticked: pressed == at, does: .ask(line), at: at)
            }
            return CentreItem(title: cue.name, ticked: pressed?.scenario == n, under: under)
        }
        let failure = self.failure.map { failed -> CentreItem in
            let words = failed.words.count > Sitting.longest ? failed.words.prefix(Sitting.longest - 1) + "…" : failed.words
            return CentreItem(title: "Last failure, \(failed.when): \(words)", enabled: false, tip: failed.words)
        }
        return CentreMenu(scenarios: scenarios, startOver: CentreItem(title: Sitting.over, does: .startOver), failure: failure)
    }

    /// He pressed an item: it becomes the last pressed, or, for "Start over", the tick and the failure go. Gives back
    /// what the app is to do for it.
    public mutating func press(_ item: CentreItem) -> CentreItem.Does {
        guard item.enabled else { return .nothing }
        if item.does == .startOver { self = Sitting() } else if let at = item.at { pressed = at }
        return item.does
    }

    /// Something failed: its words and the time it came, as the menu shows it. The last one wins.
    public mutating func failed(_ words: String, when: String) { failure = Failure(words: words, when: when) }
}
