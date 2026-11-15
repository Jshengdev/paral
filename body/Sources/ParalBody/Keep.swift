import AppKit

/// Opens what the mind asks the app to open, and nothing else. A calendar file the mind has written, in his calendar
/// app, for "add it to my calendar": only a file that exists and whose name ends in .ics. A page of USC's he asked to
/// be taken to, in his browser: only an https address on usc.edu or a site under it. It clicks nothing in either.
public enum Keep {
    /// False when the path is not a calendar file, or the Mac could not open it.
    public static func open(_ path: String) -> Bool {
        guard path.hasSuffix(".ics"), FileManager.default.fileExists(atPath: path) else { return false }
        return NSWorkspace.shared.open(URL(fileURLWithPath: path))
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
