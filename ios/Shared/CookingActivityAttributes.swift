import ActivityKit
import Foundation

/// Datos de la actividad en vivo de una cocción.
/// Este archivo se compila en la app y en la extensión de widgets.
struct CookingActivityAttributes: ActivityAttributes {
    /// Lo que cambia durante la cocción.
    struct ContentState: Codable, Hashable {
        var temperature: Double?
        var target: Double
        var reached: Bool
        var online: Bool
    }

    // Lo que queda fijo desde que empieza.
    var deviceName: String
    var startedAt: Date
    var startTemperature: Double

    // Textos ya traducidos al idioma elegido en la app.
    var labelTarget: String
    var labelReady: String
    var labelCooking: String
    var labelOffline: String
}
