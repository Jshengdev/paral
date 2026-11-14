import AVFoundation

/// Plays the voice as it arrives: 16-bit sound at 24 kHz, one channel. `stop` drops whatever is still waiting.
public final class Speaker {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 24000, channels: 1, interleaved: false)!

    public init() {
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
    }

    public func play(_ pcm: Data) {
        let frames = pcm.count / 2
        guard frames > 0, let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)), let out = buffer.floatChannelData else { return }
        buffer.frameLength = AVAudioFrameCount(frames)
        pcm.withUnsafeBytes { raw in
            let samples = raw.bindMemory(to: Int16.self)
            for i in 0..<frames { out[0][i] = Float(Int16(littleEndian: samples[i])) / 32768 }
        }
        if !engine.isRunning { try? engine.start() }
        player.scheduleBuffer(buffer)
        if !player.isPlaying { player.play() }
    }

    public func stop() { player.stop() }
}
