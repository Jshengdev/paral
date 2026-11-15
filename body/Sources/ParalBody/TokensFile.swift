import Foundation

/// The look's file on disk, watched for the dials page's saves: `changed` gives the new tokens once each time the
/// file is written. The first time it is asked it only notes when the file was last written.
public final class TokensFile {
    public let path: String
    private var written: Date?

    public init(path: String) { self.path = path }

    /// The file's tokens when it has been written since the last time this was asked; nil when it has not, the first
    /// time, and when it cannot be read.
    public func changed() -> Tokens? {
        let now = (try? FileManager.default.attributesOfItem(atPath: path))?[.modificationDate] as? Date
        guard let now, now != written else { return nil }
        defer { written = now }
        return written == nil ? nil : try? Tokens.load(path)
    }
}
