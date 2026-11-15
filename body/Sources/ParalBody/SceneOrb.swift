import Foundation

/// The orb at one moment, as the plain values its light is worked out from (`OrbLight.Frame`): the light field's
/// time, the edge's phase, and how much the edge wobbles.
public struct OrbPicture: Equatable {
    public var time, phase, wobble: Double
}

extension Scene {
    /// The orb at `t`: its clocks run from the scene's start, stepped to `orb.framesPerSecond`, so a picture changes
    /// only when the orb does, and `motion.tempo` speeds or slows them as it does all motion. At rest its edge wobbles
    /// gently and nothing else moves it. With motion reduced it is one still frame.
    func orb(at t: Double) -> OrbPicture {
        let o = tokens.orb
        let fps = max(o.framesPerSecond, 1)
        let seconds = still ? 0 : (max(t, 0) / ms(1000) * fps).rounded(.down) / fps
        return OrbPicture(time: o.fieldStart + seconds * o.driftPerSecond, phase: seconds * o.ripplePerSecond, wobble: o.restWobble)
    }
}
