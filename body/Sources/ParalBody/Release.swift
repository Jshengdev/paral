import Foundation

/// The end of a hold. The microphone stays open for a short grace after the key is let go, so his last word is
/// heard, and only then is the mind told the key came up. A new press inside that grace ends the hold before it at
/// once, so the old key-up still goes out ahead of the new key-down. The app and the scripted flow both end holds here.
public final class Release {
    private var waiting: (released: Double, timer: DispatchWorkItem)?
    private let end: (Double) -> Void

    /// `end` closes a hold. It is given the moment the key came up.
    public init(end: @escaping (_ released: Double) -> Void) { self.end = end }

    /// He let go at `released`. The hold ends after the grace, unless a new press ends it sooner.
    public func letGo(at released: Double, graceMs: Double) {
        now()
        let timer = DispatchWorkItem { [weak self] in self?.now() }
        waiting = (released, timer)
        DispatchQueue.main.asyncAfter(deadline: .now() + graceMs / 1000, execute: timer)
    }

    /// Ends a hold that is still in its grace. Called at each new press, before anything of that press is sent.
    public func now() {
        guard let waiting else { return }
        self.waiting = nil
        waiting.timer.cancel()
        end(waiting.released)
    }
}
