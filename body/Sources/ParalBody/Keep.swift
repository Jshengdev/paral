import AppKit

/// Opens what the mind asks the app to open, and nothing else. A calendar file the mind has written, in his calendar
/// app, for "add it to my calendar": only a file that exists and whose name ends in .ics. His notes, for "show me my
/// notes", in his default browser: only the one file named lost-and-found-notes.html in the temporary folder. A page
/// of USC's he asked to be taken to, in his browser: only an https address on usc.edu or a site under it. It clicks
/// nothing in any of them.
public enum Keep {
    /// The one name the notes page has, as the mind writes it (`mind/notes.ts`).
    public static let notesName = "lost-and-found-notes.html"

    /// False when the path is neither a calendar file nor the notes page, or the Mac could not open it.
    public static func open(_ path: String) -> Bool {
        if let page = notes(path) {
            guard let browser = NSWorkspace.shared.urlForApplication(toOpen: URL(string: "https://www.usc.edu/")!) else { return false }
            NSWorkspace.shared.open([page], withApplicationAt: browser, configuration: NSWorkspace.OpenConfiguration())
            return true
        }
        guard path.hasSuffix(".ics"), FileManager.default.fileExists(atPath: path) else { return false }
        return NSWorkspace.shared.open(URL(fileURLWithPath: path))
    }

    /// The notes page, when the path is the file that exists in the temporary folder under that one name. Nil for any
    /// other path: another name there, the same name in any other folder, a file that is not there.
    /// `folder` is the temporary folder, and is named only by a row, which makes its files in a folder of its own.
    public static func notes(_ path: String, in folder: String = NSTemporaryDirectory()) -> URL? {
        let page = URL(fileURLWithPath: path).standardizedFileURL.resolvingSymlinksInPath()
        let only = URL(fileURLWithPath: folder).appendingPathComponent(notesName).standardizedFileURL.resolvingSymlinksInPath()
        guard page.path == only.path, FileManager.default.fileExists(atPath: page.path) else { return nil }
        return page
    }

    /// The address, when it is one the app may open: https, and a host that is usc.edu or ends in .usc.edu. Nil for
    /// any other: http, another host (usc.edu.evil.com among them), a file path, anything that is not an address.
    public static func usc(_ address: String) -> URL? {
        guard let url = URL(string: address), url.scheme?.lowercased() == "https", let host = url.host?.lowercased(),
              host == "usc.edu" || host.hasSuffix(".usc.edu") else { return nil }
        return url
    }

    /// Opens a page of USC's in his default browser. False when the address is not one (`usc`), or the Mac could not open it.
    public static func go(_ address: String) -> Bool {
        guard let url = usc(address) else { return false }
        return NSWorkspace.shared.open(url)
    }
}
