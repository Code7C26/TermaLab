import Foundation
import Observation
import SwiftUI
import UIKit

/// Estado de la app: módulo vinculado (o demo), lectura actual y cocción.
@MainActor
@Observable
final class CookingStore {
    // MARK: configuración guardada
    var serverAddress: String
    private(set) var pairing: Pairing?
    var lang: Lang {
        didSet { UserDefaults.standard.set(lang.rawValue, forKey: Keys.lang) }
    }
    var t: Strings { lang.strings }

    // MARK: estado visible
    var presetId: String = Preset.all[0].id
    var target: Double = Preset.all[0].target
    private(set) var status: DeviceStatus?
    private(set) var reachable = true
    private(set) var history: [HistoryPoint] = []
    private(set) var now = Date()
    private(set) var busy = false
    var errorMessage: String?

    // demo
    private(set) var demoRunning = false
    private(set) var demoTemperature: Double = Preset.all[0].start
    private(set) var demoStart: Double = Preset.all[0].start
    private(set) var demoStartedAt: Date?
    private(set) var demoReached = false

    private var pollTask: Task<Void, Never>?
    private var announcedReachedAt: String?
    private var lastHistoryFetch = Date.distantPast

    private enum Keys {
        static let server = "termalab.server"
        static let pairing = "termalab.pairing"
        static let lang = "termalab.lang"
    }

    init() {
        serverAddress = UserDefaults.standard.string(forKey: Keys.server) ?? ""
        lang = Lang(rawValue: UserDefaults.standard.string(forKey: Keys.lang) ?? "") ?? .es
        if let data = UserDefaults.standard.data(forKey: Keys.pairing) {
            pairing = try? JSONDecoder().decode(Pairing.self, from: data)
        }
        startPolling()
    }

    func saveServerAddress() {
        var text = serverAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty, !text.contains("://") { text = "https://" + text }
        while text.hasSuffix("/") { text.removeLast() }
        serverAddress = text
        UserDefaults.standard.set(text, forKey: Keys.server)
    }

    private func storePairing(_ value: Pairing?) {
        pairing = value
        if let value, let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: Keys.pairing)
        } else {
            UserDefaults.standard.removeObject(forKey: Keys.pairing)
        }
    }

    // MARK: derivados
    var isDemo: Bool { pairing == nil }
    var temperature: Double? { isDemo ? demoTemperature : status?.temperature }
    var active: Bool { isDemo ? demoRunning : (status?.active ?? false) }
    var reached: Bool { isDemo ? demoReached : (active && (status?.reached ?? false)) }
    var probeMissing: Bool { !isDemo && (status?.probeMissing ?? false) }
    var moduleOnline: Bool { isDemo || (reachable && (status?.connected ?? false)) }
    var startTemperature: Double {
        isDemo ? demoStart : (status?.startTemperature ?? status?.temperature ?? Preset.all[0].start)
    }
    var elapsed: TimeInterval {
        if isDemo { return demoStartedAt.map { now.timeIntervalSince($0) } ?? 0 }
        guard active, let started = status?.startedDate else { return 0 }
        return now.timeIntervalSince(started)
    }
    var deviceName: String { status?.deviceName ?? pairing?.name ?? t.defaultModuleName }

    private var client: APIClient? {
        guard let pairing, let url = URL(string: serverAddress.trimmingCharacters(in: .whitespaces)),
              url.scheme?.hasPrefix("http") == true
        else { return nil }
        return APIClient(baseURL: url, pairing: pairing)
    }

    // MARK: ciclo de consulta
    func startPolling() {
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                await self.tick()
                try? await Task.sleep(for: .seconds(self.isDemo ? 1 : 2))
            }
        }
    }

    func scenePhaseChanged(_ phase: ScenePhase) {
        switch phase {
        case .active:
            startPolling()
        case .background:
            // Durante una cocción BackgroundKeeper mantiene la app activa y la consulta sigue.
            break
        default:
            break
        }
    }

    private func tick() async {
        now = Date()
        if isDemo {
            tickDemo()
            syncLive()
            return
        }
        guard let client else {
            syncLive()
            return
        }
        do {
            let next = try await client.status()
            status = next
            reachable = true
            if !busy, next.active { target = next.target }
            checkReached(next)
            if now.timeIntervalSince(lastHistoryFetch) > 15 {
                lastHistoryFetch = now
                history = (try? await client.history(minutes: 60)) ?? history
            }
        } catch let error as APIError where error.status == 401 || error.status == 404 {
            errorMessage = t.codeRevoked
            unpair()
        } catch {
            reachable = false
        }
        updateIdleTimer()
        syncLive()
    }

    /// Actividad en vivo y funcionamiento en segundo plano mientras dura la cocción.
    private func syncLive() {
        if active && !reached {
            BackgroundKeeper.shared.start()
        } else {
            BackgroundKeeper.shared.stop()
        }
        let state = CookingActivityAttributes.ContentState(
            temperature: temperature,
            target: target,
            reached: reached,
            online: moduleOnline && !probeMissing
        )
        LiveActivityController.shared.sync(show: active, keepFinal: reached, state: state) {
            CookingActivityAttributes(
                deviceName: self.isDemo ? self.t.demoMode : self.deviceName,
                startedAt: (self.isDemo ? self.demoStartedAt : self.status?.startedDate) ?? Date(),
                startTemperature: self.startTemperature,
                labelTarget: self.t.target,
                labelReady: self.t.goalReached,
                labelCooking: self.t.heating,
                labelOffline: self.t.badgeOff
            )
        }
    }

    private func checkReached(_ status: DeviceStatus) {
        guard status.active, status.reached, let at = status.reachedAt, at != announcedReachedAt else { return }
        announcedReachedAt = at
        Notifier.shared.goalReached(temperature: status.temperature ?? status.target, target: status.target, strings: t)
    }

    private func updateIdleTimer() {
        // Con una cocción en curso la pantalla no se apaga (el celular puede quedar en la mesada).
        UIApplication.shared.isIdleTimerDisabled = active && !reached
    }

    // MARK: acciones
    func selectPreset(_ preset: Preset) {
        presetId = preset.id
        setTarget(preset.target)
        if isDemo { resetDemo(start: preset.start) }
    }

    func changeTarget(by delta: Double) {
        presetId = "custom"
        setTarget(min(max(target + delta, 40), 100))
        if isDemo { resetDemo(start: demoStart) }
    }

    private func setTarget(_ value: Double) {
        target = value
        guard !isDemo, active, let client else { return }
        Task {
            if let next = try? await client.session("target", target: value) { status = next }
        }
    }

    func toggleCooking() {
        Notifier.shared.requestAuthorization()
        if isDemo {
            if demoRunning { demoRunning = false } else { startDemo() }
            return
        }
        guard let client else {
            errorMessage = t.configureServer
            return
        }
        busy = true
        let action = active ? "stop" : "start"
        let value = target
        Task {
            defer { busy = false }
            do {
                status = try await client.session(action, target: value)
                reachable = true
                updateIdleTimer()
                syncLive()
            } catch let error as APIError where error.status > 0 {
                errorMessage = t.requestFailed(error.status)
            } catch {
                errorMessage = t.serverUnreachable
            }
        }
    }

    /// Valida el código contra el servidor y guarda la vinculación.
    func pair(code: String) async -> Bool {
        saveServerAddress()
        guard let parsed = Pairing.parse(code) else {
            errorMessage = t.pairFormat
            return false
        }
        guard let url = URL(string: serverAddress.trimmingCharacters(in: .whitespaces)),
              url.scheme?.hasPrefix("http") == true
        else {
            errorMessage = t.serverMissing
            return false
        }
        let candidate = Pairing(id: parsed.id, key: parsed.key, name: "")
        do {
            let found = try await APIClient(baseURL: url, pairing: candidate).status()
            storePairing(Pairing(id: parsed.id, key: parsed.key, name: found.deviceName))
            status = found
            history = []
            lastHistoryFetch = .distantPast
            demoRunning = false
            errorMessage = nil
            startPolling()
            return true
        } catch let error as APIError where error.status == 401 || error.status == 404 {
            errorMessage = t.pairWrong
        } catch {
            errorMessage = t.serverUnreachable
        }
        return false
    }

    func unpair() {
        storePairing(nil)
        status = nil
        history = []
        UIApplication.shared.isIdleTimerDisabled = false
        syncLive()
        startPolling()
    }

    // MARK: demo
    private func resetDemo(start: Double) {
        demoRunning = false
        demoReached = false
        demoStart = start
        demoTemperature = start
        demoStartedAt = nil
    }

    private func startDemo() {
        let start = Preset.all.first { $0.id == presetId }?.start ?? demoStart
        demoStart = start
        demoTemperature = start
        demoReached = false
        demoStartedAt = Date()
        demoRunning = true
    }

    private func tickDemo() {
        guard demoRunning, let started = demoStartedAt else { return }
        demoTemperature = Temperature.simulated(start: demoStart, target: target, elapsed: now.timeIntervalSince(started))
        if demoTemperature >= target - Temperature.tolerance {
            demoReached = true
            demoRunning = false
            Notifier.shared.goalReached(temperature: demoTemperature, target: target, strings: t)
        }
        updateIdleTimer()
    }
}
