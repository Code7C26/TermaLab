import Foundation

struct Preset: Identifiable, Hashable {
    let id: String
    let label: String
    let emoji: String
    let target: Double
    let start: Double

    static let all: [Preset] = [
        Preset(id: "carne", label: "Carne", emoji: "🥩", target: 63, start: 8),
        Preset(id: "pollo", label: "Pollo", emoji: "🍗", target: 74, start: 8),
        Preset(id: "pan", label: "Pan", emoji: "🍞", target: 96, start: 22),
    ]
}

/// Estado del módulo tal como lo devuelve GET /api/v1/devices/:id
struct DeviceStatus: Decodable, Equatable {
    let deviceId: String
    let deviceName: String
    let temperature: Double?
    let probe: String
    let connected: Bool
    let measuredAt: String?
    let target: Double
    let active: Bool
    let startedAt: String?
    let startTemperature: Double?
    let reached: Bool
    let reachedAt: String?

    var probeMissing: Bool { probe == "open" }
    var startedDate: Date? { startedAt.flatMap(ISODate.parse) }
    var measuredDate: Date? { measuredAt.flatMap(ISODate.parse) }
}

struct HistoryPoint: Decodable, Identifiable {
    let t: String
    let temperature: Double?
    var id: String { t }
    var date: Date { ISODate.parse(t) ?? .distantPast }
}

struct HistoryResponse: Decodable {
    let points: [HistoryPoint]
}

struct Pairing: Codable, Equatable {
    var id: String
    var key: String
    var name: String

    /// "pmcnqj-4JJS-RYSH" -> id "pmcnqj", clave "4JJSRYSH"
    static func parse(_ code: String) -> (id: String, key: String)? {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let dash = clean.firstIndex(of: "-") else { return nil }
        let id = clean[..<dash].lowercased()
        let key = clean[clean.index(after: dash)...].filter { $0.isLetter || $0.isNumber }.uppercased()
        guard id.count >= 4, id.count <= 16, id.allSatisfy({ $0.isLetter || $0.isNumber }), key.count >= 6
        else { return nil }
        return (id, key)
    }
}

enum ISODate {
    private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain = ISO8601DateFormatter()

    static func parse(_ text: String) -> Date? {
        withFraction.date(from: text) ?? plain.date(from: text)
    }
}

enum Temperature {
    static let tolerance = 0.5

    enum State { case heating, ready, high }

    static func state(_ temperature: Double, target: Double) -> State {
        let difference = target - temperature
        if abs(difference) <= tolerance { return .ready }
        return difference > tolerance ? .heating : .high
    }

    static func progress(_ temperature: Double, start: Double, target: Double) -> Double {
        guard target != start else { return 1 }
        return min(max((temperature - start) / (target - start), 0), 1)
    }

    /// Misma curva que la demo del servidor.
    static func simulated(start: Double, target: Double, elapsed: TimeInterval) -> Double {
        let value = start + (target - start) * (1 - exp(-max(elapsed, 0) / 19))
        return (min(value, target) * 10).rounded() / 10
    }

    static func elapsedText(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds))
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}
