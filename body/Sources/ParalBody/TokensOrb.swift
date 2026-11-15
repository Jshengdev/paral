import Foundation

extension Tokens {
    /// The orb that rests at the bottom centre while the pill is shut, after the designer's orb handoff
    /// (`OrbLight.swift`, `PainterOrb.swift`). Its square of light is `size` across (its blob is `blob` of that, as a
    /// share of the half side), its foot `capsule.bottom` above the floor. At rest its edge wobbles by `restWobble`
    /// and its ripples turn `ripplePerSecond` (her idle, 0.35 and 0.04); its light drifts `driftPerSecond` (her
    /// film's rate; her orb's idle is 1) from `fieldStart`, her patch of light. The light is rounded to `levels` steps
    /// through an ordered dither of `ditherCell` points, and stepped `framesPerSecond` times a second (her 30). Her
    /// ramp runs from `deep` at the rim through `gold` and `pale` to `white`. With paral's ink on the page the cross
    /// that clears it sits `crossGap` right of the blob, `capsule.restClose` across.
    public struct Orb: Codable {
        public var size, blob, restWobble, ripplePerSecond, driftPerSecond, fieldStart, levels, ditherCell, framesPerSecond, crossGap: Double
        public var deep, gold, pale, white: String
    }
}
