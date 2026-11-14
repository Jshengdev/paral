import AVFoundation

/// The microphone, as chunks of 16-bit sound at 16 kHz, one channel. It runs only while the key is held.
public final class Mic {
    private let engine = AVAudioEngine()
    private var converter: AVAudioConverter?
    private let wanted = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true)!
    public var onSound: ((Data) -> Void)?
    public var onFailed: ((String) -> Void)?

    public init() {}

    public static var allowed: Bool { AVCaptureDevice.authorizationStatus(for: .audio) == .authorized }

    public static func ask(_ done: @escaping (Bool) -> Void) {
        AVCaptureDevice.requestAccess(for: .audio) { allowed in DispatchQueue.main.async { done(allowed) } }
    }

    public func start() {
        let input = engine.inputNode
        let from = input.outputFormat(forBus: 0)
        guard from.sampleRate > 0, let converter = AVAudioConverter(from: from, to: wanted) else {
            onFailed?("the microphone gave no usable sound format")
            return
        }
        self.converter = converter
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 4096, format: from) { [weak self] buffer, _ in self?.take(buffer) }
        do {
            engine.prepare()
            try engine.start()
        } catch {
            onFailed?("the microphone did not start (\(error.localizedDescription))")
        }
    }

    public func stop() {
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
    }

    private func take(_ buffer: AVAudioPCMBuffer) {
        guard let converter else { return }
        let room = AVAudioFrameCount(Double(buffer.frameLength) * wanted.sampleRate / buffer.format.sampleRate) + 32
        guard let out = AVAudioPCMBuffer(pcmFormat: wanted, frameCapacity: room) else { return }
        var given = false
        var failed: NSError?
        converter.convert(to: out, error: &failed) { _, status in
            if given {
                status.pointee = .noDataNow
                return nil
            }
            given = true
            status.pointee = .haveData
            return buffer
        }
        guard failed == nil, out.frameLength > 0, let samples = out.int16ChannelData else { return }
        let sound = Data(bytes: samples[0], count: Int(out.frameLength) * 2)
        DispatchQueue.main.async { self.onSound?(sound) }
    }
}
