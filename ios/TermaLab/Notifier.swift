import Foundation
import UIKit
import UserNotifications

/// Avisos locales: suenan con la app abierta o recién minimizada.
/// (Los avisos con la app cerrada necesitan la cuenta paga de Apple para APNs;
/// mientras tanto los da la web instalable.)
final class Notifier: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Notifier()

    func configure() {
        UNUserNotificationCenter.current().delegate = self
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    func goalReached(temperature: Double, target: Double) {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        let content = UNMutableNotificationContent()
        content.title = "¡Está listo! 🍽️"
        content.body = String(format: "La sonda marca %.1f °C (objetivo %.0f °C).", temperature, target)
        content.sound = .default
        let request = UNNotificationRequest(identifier: "termalab-goal", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }

    // Mostrar el aviso también con la app en primer plano.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .list])
    }
}
