import Foundation

/// How loud a chunk of sound is, for the pill's wave, the way the design kit's handoff feeds its meter: the sound's
/// root mean square in decibels below full scale, held between `quietest` and 0, laid onto 0 to 1. Silence is 0 and
/// full scale is 1. It reads 16-bit samples at any rate, so it serves the microphone (16 kHz) and the voice (24 kHz).
public enum Meter {
    /// The handoff's floor: everything at or below 50 dB under full scale is silence. Not measured here.
    static let quietest = -50.0

    public static func level(_ pcm: Data) -> Double {
        let count = pcm.count / 2
        guard count > 0 else { return 0 }
        let sum = pcm.withUnsafeBytes { raw in
            (0..<count).reduce(0.0) { sum, i in
                let sample = Double(Int16(littleEndian: raw.loadUnaligned(fromByteOffset: 2 * i, as: Int16.self)))
                return sum + sample * sample
            }
        }
        let rms = (sum / Double(count)).squareRoot() / 32768
        let db = rms > 0 ? 20 * log10(rms) : quietest
        return (min(max(db, quietest), 0) - quietest) / -quietest
    }
}

extension Seen {
    /// What the scene is told of a chunk of the microphone's sound: how loud it was, and how long it lasts at 16 kHz,
    /// two bytes a sample. The app tells it so for each chunk it sends, and a film reads it from the record's `mic` lines.
    public static func sound(_ pcm: Data) -> Seen { .mic(level: Meter.level(pcm), ms: Double(pcm.count) / 32) }
}
