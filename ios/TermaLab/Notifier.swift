import Foundation
import UIKit
import UserNotifications

/// Avisos locales. Durante una cocción la app sigue activa en segundo plano
/// (ver BackgroundKeeper), así que el aviso llega también con el iPhone bloqueado.
/// Los avisos remotos (APNs) necesitan la cuenta paga de Apple.
final class Notifier: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Notifier()

    func configure() {
        UNUserNotificationCenter.current().delegate = self
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    func goalReached(temperature: Double, target: Double, strings: Strings) {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        let content = UNMutableNotificationContent()
        content.title = strings.notificationTitle
        content.body = strings.notificationBody(temperature, target)
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
