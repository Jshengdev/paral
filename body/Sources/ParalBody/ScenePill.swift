import Foundation

extension Scene {
    /// What the pill shows besides its words: its wave, and the logo mark that breathes by it while paral works.
    func dress(_ capsule: inout CapsulePicture, at t: Double, cursorUp: Bool) {
        if capsule.look == .thinking, !cursorUp { capsule.working = still ? 0 : working(at: t) }
        // The wave moves while he speaks and while paral thinks or answers; at rest and on a failure it is still dots.
        guard [.listening, .thinking, .speaking].contains(capsule.look) else { return }
        let w = tokens.wave, step = max(ms(w.sampleMs), 1)
        let newest = (t / step).rounded(.down)
        let count = Int((w.width / w.pitch).rounded(.up)) + 1
        capsule.wave = (0..<count).reversed().map { back in level(at: (newest - Double(back)) * step) }
        // It scrolls right to left, one pitch a sample. Where every sample is quiet the dots stand still, since a row
        // of even dots looks the same moved, and the window need not be drawn again for it.
        let quiet = capsule.wave.allSatisfy { $0 < w.quiet }
        capsule.scrolled = still || quiet ? 0 : t / step - newest
    }

    /// Below what share of the display's height (0 is its top) the page's own ink is taken as well as its read
    /// lines, so the pill, its bubble and the cross keep off a drawing too (`Screen.taken`): the band at the foot.
    public var footShare: Double { max(0, Layout.inkFrom(width: width, height: floor, tokens: tokens) / max(height, 1)) }

    /// How loud it is at `t`, 0 to 1: the microphone's sound where a chunk of it covers that moment (each stands for
    /// its own length and one sample's time more, so the wave does not drop between two chunks), and otherwise the
    /// voice that is being said then. Silence is 0.
    func level(at t: Double) -> Double {
        if let sound = sounds.last(where: { $0.at <= t }), t < sound.at + sound.ms + tokens.wave.sampleMs { return sound.level }
        for ask in asks.suffix(3).reversed() {
            guard let now = times(ask).first(where: { $0.start <= t && t < $0.end }), let said = ask.beats[now.beat] else { continue }
            // The voice is 16-bit sound at 24 kHz: 48 bytes a millisecond.
            let byte = Int((t - now.start) * 48)
            return said.levels.last { $0.from <= byte }?.level ?? 0
        }
        return 0
    }
}
