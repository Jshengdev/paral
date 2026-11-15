import CoreGraphics
import Foundation

/// The pages of a recorded run, and when each one came up. A run begins on its flow's page. A step of the flow may
/// put another page on the screen (he scrolled, opened a section, followed a link), and the record shows when: from
/// then on the look and screen lines carry that page's smaller copy, which the flow names by the page's number.
struct FilmPages {
    /// By number: 0 is the flow's own page, then the page of each step that names one, in the flow's order.
    var pictures: [CGImage]
    /// Each time the record shows another page than the one before: when, and which.
    var changes: [(at: Double, page: Int)] = []

    /// The name of the smaller copy of a page that goes to the mind. The flow writes it and the film reads it back.
    static func sentAs(page: Int) -> String { page == 0 ? "page-for-the-brain.jpg" : "page-\(page)-for-the-brain.jpg" }

    init(flow: [String: Any], first: CGImage) throws {
        let later = (flow["asks"] as? [[String: Any]] ?? []).compactMap { $0["page"] as? String }
        pictures = try [first] + later.map(Screen.load)
    }

    /// Takes one line of the record. A look or a screen line whose picture is another page's copy is a change of
    /// page. A picture that is no page's copy (the part he drew around) changes nothing.
    mutating func take(_ fields: [String: Any], at: Double) {
        guard let type = fields["type"] as? String, type == "look" || type == "screen",
              let path = (fields["picture"] as? [String: Any])?["path"] as? String,
              let page = pictures.indices.first(where: { FilmPages.sentAs(page: $0) == URL(fileURLWithPath: path).lastPathComponent }),
              page != (changes.last?.page ?? 0)
        else { return }
        changes.append((at, page))
    }

    /// The number of the page on the screen at `t`.
    func page(at t: Double) -> Int { changes.last { $0.at <= t }?.page ?? 0 }
}
