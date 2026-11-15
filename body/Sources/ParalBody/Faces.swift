import AppKit
import CoreText

/// The look's typeface, made once for each size and weight and kept. The family is a token. Where the family has an
/// optical size (the design kit's DM Sans does), it is set to the token's, as the kit sets it. When this Mac does not
/// have the family the system's font is used, and that is said once on the error stream: nothing is downloaded.
final class Faces {
    private static let weightAxis = NSNumber(value: 0x7767_6874), opticalAxis = NSNumber(value: 0x6F70_737A)
    private let family: String
    private let optical: Double
    private var made: [String: NSFont] = [:]

    /// The families already said to be missing, so the painter and the scene's measure say it once between them.
    private static var told: Set<String> = []
    /// One kept for each family and optical size, for measuring words outside the painter (a tag's, in the scene).
    private static var kept: [String: Faces] = [:]

    static func kept(family: String, optical: Double) -> Faces {
        if let known = kept["\(family)/\(optical)"] { return known }
        let made = Faces(family: family, optical: optical)
        kept["\(family)/\(optical)"] = made
        return made
    }

    init(family: String, optical: Double) {
        self.family = family
        self.optical = optical
        // An empty family asks for the system's font, which is not a fallback and is not announced.
        if !family.isEmpty, NSFontManager.shared.availableMembers(ofFontFamily: family) == nil, Faces.told.insert(family).inserted {
            FileHandle.standardError.write(Data("paral: the font \"\(family)\" is not on this Mac, so the system's font is used\n".utf8))
        }
    }

    func face(_ size: Double, _ weight: NSFont.Weight) -> NSFont {
        let key = "\(size)/\(weight.rawValue)"
        if let known = made[key] { return known }
        let font = make(size, weight)
        made[key] = font
        return font
    }

    private func make(_ size: Double, _ weight: NSFont.Weight) -> NSFont {
        // The font manager counts weight from 0 to 15 with 5 as regular; a weight axis counts 400 as regular.
        let heavy: (manager: Int, axis: Double) = weight == .bold ? (9, 700) : weight == .semibold ? (8, 600) : weight == .medium ? (6, 500) : (5, 400)
        guard !family.isEmpty, let face = NSFontManager.shared.font(withFamily: family, traits: [], weight: heavy.manager, size: size) else {
            return .systemFont(ofSize: size, weight: weight)
        }
        let axes = (CTFontCopyVariationAxes(face) as? [[CFString: Any]] ?? []).compactMap { $0[kCTFontVariationAxisIdentifierKey] as? NSNumber }
        guard axes.contains(Faces.opticalAxis) else { return face }
        var set: [NSNumber: Double] = [Faces.opticalAxis: optical]
        if axes.contains(Faces.weightAxis) { set[Faces.weightAxis] = heavy.axis }
        return NSFont(descriptor: face.fontDescriptor.addingAttributes([.variation: set]), size: size) ?? face
    }
}
