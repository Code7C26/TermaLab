import AVFoundation
import Foundation

/// Mantiene la app funcionando en segundo plano mientras dura una cocción.
///
/// iOS suspende las apps a los pocos segundos de bloquear el celular, y los avisos
/// remotos (APNs) necesitan la cuenta paga de Apple. Para poder seguir consultando
/// al servidor con el iPhone bloqueado, durante la cocción la app reproduce audio
/// en silencio (modo de segundo plano "audio"). Se apaga al llegar al objetivo o
/// al terminar la cocción.
@MainActor
final class BackgroundKeeper {
    static let shared = BackgroundKeeper()

    private var player: AVAudioPlayer?

    private init() {}

    func start() {
        if player?.isPlaying == true { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
            let next = try AVAudioPlayer(data: Self.silentWav())
            next.numberOfLoops = -1
            next.volume = 0
            next.play()
            player = next
        } catch {
            // Si otra app tiene el audio (por ejemplo, una llamada) se reintenta en la próxima lectura.
            player = nil
        }
    }

    func stop() {
        guard let current = player else { return }
        current.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// Un segundo de silencio en formato WAV (PCM de 16 bits, mono, 8 kHz).
    private static func silentWav() -> Data {
        let sampleRate = 8000
        let dataSize = sampleRate * 2
        var wav = Data()
        func text(_ value: String) { wav.append(contentsOf: Array(value.utf8)) }
        func u32(_ value: Int) { withUnsafeBytes(of: UInt32(value).littleEndian) { wav.append(contentsOf: $0) } }
        func u16(_ value: Int) { withUnsafeBytes(of: UInt16(value).littleEndian) { wav.append(contentsOf: $0) } }
        text("RIFF"); u32(36 + dataSize); text("WAVE")
        text("fmt "); u32(16); u16(1); u16(1); u32(sampleRate); u32(sampleRate * 2); u16(2); u16(16)
        text("data"); u32(dataSize)
        wav.append(Data(count: dataSize))
        return wav
    }
}
