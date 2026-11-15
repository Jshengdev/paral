import Foundation

public let seamVersion = 1

public struct Box: Equatable {
    public var x, y, w, h: Double
    public init(x: Double, y: Double, w: Double, h: Double) { self.x = x; self.y = y; self.w = w; self.h = h }
    public var json: [String: Double] { ["x": x, "y": y, "w": w, "h": h] }
    public func moved(dx: Double, dy: Double) -> Box { Box(x: x + dx, y: y + dy, w: w, h: h) }
    public func grown(_ pad: Double) -> Box { Box(x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad) }
}

public struct DisplayPlace: Equatable {
    public var id: Int
    public var scale, x, y: Double
    public init(id: Int, scale: Double, x: Double, y: Double) { self.id = id; self.scale = scale; self.x = x; self.y = y }
}

public struct ReadLine: Equatable {
    public var text: String
    public var box: Box
    public init(text: String, box: Box) { self.text = text; self.box = box }
}

public struct Refused: Error, Equatable {
    public let why: String
    init(_ why: String) { self.why = why }
}

/// Every line the body sends to the mind.
public enum ToMind {
    case hello
    case keyDown(at: Double)
    case mic(pcm: Data, at: Double)
    case trail(x: Double, y: Double, at: Double)
    case keyUp(at: Double)
    /// An ask whose words were tapped or typed, not spoken. A screen line follows it, as after a press of the key.
    case typed(text: String, at: Double)
    case screen(at: Double, display: DisplayPlace, path: String, w: Int, h: Int, lines: [ReadLine])
    /// A look with no key pressed: what is on the display now, sent when it has changed and then stood still.
    case look(at: Double, display: DisplayPlace, path: String, w: Int, h: Int, lines: [ReadLine])
    case close(at: Double)
    /// He pressed the left button at this place, in display points.
    case click(x: Double, y: Double, at: Double)

    public var line: String {
        var fields: [String: Any]
        switch self {
        case .hello: fields = ["type": "hello", "body": "paral"]
        case .keyDown(let at): fields = ["type": "key.down", "at": at]
        case .mic(let pcm, let at): fields = ["type": "mic", "pcm": pcm.base64EncodedString(), "at": at]
        case .trail(let x, let y, let at): fields = ["type": "trail", "x": x, "y": y, "at": at]
        case .keyUp(let at): fields = ["type": "key.up", "at": at]
        case .typed(let text, let at): fields = ["type": "typed", "text": text, "at": at]
        case .close(let at): fields = ["type": "close", "at": at]
        case .click(let x, let y, let at): fields = ["type": "click", "x": x, "y": y, "at": at]
        case .screen(let at, let display, let path, let w, let h, let lines), .look(let at, let display, let path, let w, let h, let lines):
            var type = "screen"
            if case .look = self { type = "look" }
            fields = [
                "type": type, "at": at,
                "display": ["id": display.id, "scale": display.scale, "x": display.x, "y": display.y],
                "picture": ["path": path, "w": w, "h": h],
                "lines": lines.map { ["text": $0.text, "box": $0.box.json] },
            ]
        }
        fields["v"] = seamVersion
        let data = try! JSONSerialization.data(withJSONObject: fields, options: [.sortedKeys])
        return String(decoding: data, as: UTF8.self) + "\n"
    }
}
