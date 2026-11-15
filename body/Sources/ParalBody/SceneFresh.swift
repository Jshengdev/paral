import Foundation

extension Scene {
    /// A scene with nothing taken yet, on the same display, with the same look, motion and guide switch, and his
    /// pointer where it was seen: what "Start over" leaves on screen. No mark, card, board, way, guide's line or failure.
    public func fresh() -> Scene {
        var scene = Scene(width: width, height: height, tokens: tokens, bottomInset: bottomInset)
        scene.reduceMotion = reduceMotion
        scene.guideOn = guideOn
        scene.his = his
        return scene
    }
}
