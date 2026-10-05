import Foundation

struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}

/// Cliente de la API de TermaLab (mismo servidor que la web).
struct APIClient {
    var baseURL: URL
    var pairing: Pairing

    private func request(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> Data {
        var base = baseURL.absoluteString
        while base.hasSuffix("/") { base.removeLast() }
        guard let url = URL(string: "\(base)/api/v1/devices/\(pairing.id)\(path)") else {
            throw APIError(status: 0, message: "La dirección del servidor no es válida.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 8
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(pairing.key, forHTTPHeaderField: "X-App-Key")
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw APIError(status: status, message: message ?? "Error de conexión (\(status)).")
        }
        return data
    }

    func status() async throws -> DeviceStatus {
        try JSONDecoder().decode(DeviceStatus.self, from: await request(""))
    }

    func history(minutes: Int = 60) async throws -> [HistoryPoint] {
        try JSONDecoder().decode(HistoryResponse.self, from: await request("/history?minutes=\(minutes)")).points
    }

    func session(_ action: String, target: Double? = nil) async throws -> DeviceStatus {
        var body: [String: Any] = ["action": action]
        if let target { body["target"] = target }
        return try JSONDecoder().decode(DeviceStatus.self, from: await request("/session", method: "POST", body: body))
    }
}
