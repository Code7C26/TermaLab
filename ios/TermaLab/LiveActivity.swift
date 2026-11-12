import ActivityKit
import Foundation

/// Maneja la actividad en vivo de la cocción (pantalla bloqueada y Dynamic Island).
/// Se actualiza desde la app; no usa avisos remotos.
@MainActor
final class LiveActivityController {
    static let shared = LiveActivityController()

    private var activity: Activity<CookingActivityAttributes>?
    private var lastState: CookingActivityAttributes.ContentState?
    private var lastUpdate = Date.distantPast

    private init() {
        // Si la app se reabre con una cocción en curso, retoma la actividad que ya estaba.
        activity = Activity<CookingActivityAttributes>.activities.first { $0.activityState == .active }
    }

    /// - Parameters:
    ///   - show: hay una cocción en curso.
    ///   - keepFinal: al terminar, dejar el último estado visible en la pantalla bloqueada.
    func sync(
        show: Bool,
        keepFinal: Bool,
        state: CookingActivityAttributes.ContentState,
        attributes: () -> CookingActivityAttributes
    ) {
        if show {
            if let activity {
                update(activity, state: state)
            } else {
                start(attributes: attributes(), state: state)
            }
        } else if let current = activity {
            activity = nil
            lastState = nil
            let lastContent = content(state)
            Task { await current.end(lastContent, dismissalPolicy: keepFinal ? .default : .immediate) }
        }
    }

    private func start(attributes: CookingActivityAttributes, state: CookingActivityAttributes.ContentState) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        // Limpia actividades viejas que hayan quedado en la pantalla bloqueada.
        for old in Activity<CookingActivityAttributes>.activities {
            Task { await old.end(nil, dismissalPolicy: .immediate) }
        }
        do {
            activity = try Activity<CookingActivityAttributes>.request(
                attributes: attributes,
                content: content(state),
                pushType: nil
            )
            lastState = state
            lastUpdate = Date()
        } catch {
            // iOS solo deja iniciar la actividad con la app en primer plano; se reintenta en la próxima lectura.
            activity = nil
        }
    }

    private func update(_ activity: Activity<CookingActivityAttributes>, state: CookingActivityAttributes.ContentState) {
        let since = Date().timeIntervalSince(lastUpdate)
        let important = state.reached != lastState?.reached
            || state.target != lastState?.target
            || state.online != lastState?.online
        // La temperatura se refresca cada 5 s como mucho; sin cambios, cada 30 s para que no figure como vencida.
        guard important || (state != lastState && since >= 5) || since >= 30 else { return }
        lastState = state
        lastUpdate = Date()
        let next = content(state)
        Task { await activity.update(next) }
    }

    private func content(
        _ state: CookingActivityAttributes.ContentState
    ) -> ActivityContent<CookingActivityAttributes.ContentState> {
        // Si la app deja de actualizar, a los 90 s la actividad se marca como vencida.
        ActivityContent(state: state, staleDate: state.reached ? nil : Date().addingTimeInterval(90))
    }
}
