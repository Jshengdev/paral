import AppKit

/// Opens a calendar file the mind has written, in his calendar app, for "add it to my calendar". It opens nothing
/// else: only a file that exists and whose name ends in .ics. It clicks nothing in the calendar.
public enum Keep {
    /// False when the path is not a calendar file, or the Mac could not open it.
    public static func open(_ path: String) -> Bool {
        guard path.hasSuffix(".ics"), FileManager.default.fileExists(atPath: path) else { return false }
        return NSWorkspace.shared.open(URL(fileURLWithPath: path))
    }
}
